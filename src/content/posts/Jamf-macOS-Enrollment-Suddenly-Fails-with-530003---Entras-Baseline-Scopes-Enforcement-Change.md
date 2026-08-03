---
title: "Jamf macOS Enrollment Suddenly Fails with 530003 - Entra's Baseline Scopes Enforcement Change"
date: 2026-08-03
description: "Conditional Access is one of those areas where nothing changes for months and then something changes underneath you without any edit on your side. That is exactly what happened to us with Ja…"
categories: ["Microsoft", "Entra ID"]
tags: ["Microsoft", "Entra ID", "Conditional Access Policies", "Jamf", "macOS", "Device Compliance"]
# Optional — wenn gesetzt, zeigt der Artikel ein Verifiziert-Siegel:
# verified: 2026-08-03
# testedAgainst: "Entra Admin Center + Graph PowerShell 2.3"
# effort: "~20 Min"
---

Conditional Access is one of those areas where nothing changes for months and then something changes underneath you without any edit on your side. That is exactly what happened to us with Jamf Device Compliance registration on macOS.

Before we get to the fix, let's look at what actually broke.

## The Challenge

New Macs could no longer be registered. Every attempt ended in the sign-in logs like this:

| Field | Value |
|---|---|
| Sign-in error code | `530003` |
| Failure reason | Your device is required to be managed to access this resource |
| Application | User registration app for Device Compliance (`b03c10a8-71c7-45f9-b44a-3335ab76e970`) |
| Resource | Microsoft Graph (`00000003-0000-0000-c000-000000000000`) |
| Client app | Mobile Apps and Desktop clients |
| Incoming token type | Primary refresh token |
| User agent | `... PKeyAuth/1.0` on macOS |

A textbook chicken-and-egg problem. The device cannot become compliant, because becoming compliant requires it to already be compliant.

One thing worth separating out early: we also saw `50126` errors from the same user around the same time. That code means nothing more than a mistyped password. Only `530003` (and its relatives `53000` and `53001`) point at Conditional Access.

## Why the Obvious Fix Doesn't Work

Our Conditional Access policy targeted **All resources** and required a compliant device, and the registration app was already listed under **Target resources → Exclude**. So why was it still being blocked?

Because Conditional Access evaluates the **resource** a token is requested for, not the client application making the request. In the log above, the registration app is the *client*. The resource is Microsoft Graph. Excluding the app under Target resources therefore does not address this sign-in at all.

Which raises the obvious follow-up question: if that was always true, why did this ever work?

## What Actually Changed

Until mid-June 2026, it worked because of a behaviour most of us never had a reason to know about.

A policy targeting **All resources** that also contained **at least one resource exclusion** was skipped entirely for sign-ins that requested only **baseline scopes**. Our registration flow quietly lived inside that exemption for years.

Microsoft changed this. Rollout started on **15 June 2026** and was staggered over several weeks, announced as **MC1223829**. Those scopes are now evaluated as directory access and are subject to the policy.

Baseline scopes are:

- OIDC scopes: `email`, `offline_access`, `openid`, `profile`
- Baseline directory scopes: `User.Read`, `User.Read.All`, `User.ReadBasic.All`, `People.Read`, `People.Read.All`, `GroupMember.Read.All`, `Member.Read.Hidden`

This is not a Jamf problem. Any public client or ISV application that requests only these scopes and relied on an exclusion from an All-resources policy is in the same position. Jamf Connect came up in community discussions for the same reason.

## Prove It Before You Change Anything

The timing correlation is suggestive, not conclusive. The decisive question is whether the failing flow really requests only baseline scopes — and there is a clean way to answer that without touching the policy.

1. Register a new **single tenant** application as a placeholder. No API permissions, no credentials, no redirect URIs.
2. Go to `https://aka.ms/BaselineScopesSettingsUX` and pick **Enable enforcement** with that placeholder app. Leave the policy alone for now. Nothing about the behaviour changes — sign-ins requesting only baseline scopes will simply start listing the placeholder as a Conditional Access audience.
3. Reproduce the failing registration, then query:

```http
GET https://graph.microsoft.com/beta/auditLogs/signIns
  ?$filter=createdDateTime ge 2026-08-01T00:00:00Z
    and conditionalAccessAudiences/any(a:a eq '<placeholder-app-id>')
  &$select=createdDateTime,appId,appDisplayName,userPrincipalName,conditionalAccessStatus
```

If `b03c10a8-71c7-45f9-b44a-3335ab76e970` shows up in the results, the diagnosis holds.

Two cheap sanity checks alongside it: look at the consented delegated permissions on the app under *Enterprise Applications*, and ask whether enrollment worked before mid-June. A "yes" closes the case.

## The Solution: Customize Behavior

Microsoft documents a way to keep the old behaviour for a single policy rather than the whole tenant.

1. Register the placeholder application, if you have not already done so for the verification step.
2. In the affected policy, add that placeholder app under **Target resources → Exclude**.
3. In the baseline scopes settings, choose **Customize behavior**, save, and select the placeholder app.

Baseline scope sign-ins are then evaluated against the placeholder application. Since the placeholder is excluded from the policy, the legacy behaviour is retained — for that one policy only.

Microsoft lists our exact scenario as a valid use case: *All resources policies with compliant device requirements where certain apps must work on unmanaged devices*. They also recommend aligning with the new enforcement model and using this option only where the legacy behaviour is genuinely required.

## Thing That Doees Not Help

**Excluding Microsoft Graph.** It works, and it opens a door far wider than the one you were trying to walk through.

## What Else?

Be honest with yourself about what this setting does. It restores the legacy behaviour for *every* client requesting only baseline scopes against that policy, not just for Jamf. Access that needs anything beyond baseline scopes — Exchange Online, SharePoint, Graph with broader permissions — still hits the policy, which limits the practical blast radius considerably.

The useful framing is that this is not a new hole. It is precisely the posture the tenant had until 15 June 2026. But it is one that should expire rather than quietly become permanent.

So write it down. Put the reason in the description field of the placeholder app, note it in your Conditional Access documentation, and give it a review date. The long-term fix is the vendor moving the registration app to pure OIDC scopes — which is a conversation with the vendor, not with Microsoft support.

## References

- [Enforcement for baseline scopes in Conditional Access](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-enforcement-resource-exclusions)
- [Filter for devices as a condition in Conditional Access policy](https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-condition-filters-for-devices)
- [Enforce compliance on Macs managed with Jamf Pro](https://learn.microsoft.com/en-us/mem/intune/protect/conditional-access-assign-jamf)
