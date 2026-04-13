# Feature Spec: Row 029 — 房東的預約看房管理功能
# Landlord Appointment Viewing Management

**Version**: 1.0  
**Date**: 2026-04-12  
**Status**: Approved  
**TDD Ref**: `/project-process/features/tdd-landlord-20260221.md` (T-08, T-09)

---

## 1. Feature Overview

Landlords can manage tenant/buyer viewing appointments via a monthly calendar view and receive/send email notifications when appointment status changes.

---

## 2. User Stories

**US-01 — Calendar View**  
As a landlord, I want to see all viewing appointments in a monthly calendar view so I can track my schedule.

**US-02 — Email Notification on Status Change**  
As a tenant/buyer, I want to receive an email notification when the landlord confirms, cancels, or completes my viewing appointment.

---

## 3. Acceptance Criteria

### AC-01: Monthly Calendar View (T-09)

- [ ] Calendar renders a full month grid starting Sunday, ending Saturday
- [ ] Each day cell shows appointments scheduled for that date
- [ ] Appointments within a day are sorted ascending by `preferred_time`
- [ ] Each appointment chip displays: visitor name, time slot, property title
- [ ] Status is visually differentiated: `pending` / `confirmed` / `completed` / `cancelled`
- [ ] Month navigation (prev/next) updates the displayed grid correctly
- [ ] Today's date is visually highlighted
- [ ] Empty days render without errors

### AC-02: Email Notification on Confirmation (T-08)

- [ ] When landlord sets appointment status to `confirmed`, tenant email is sent automatically
- [ ] Email subject: `[RESA AI] 看房預約已確認 — {propertyTitle}`
- [ ] Email body contains: tenant name, property title, property address, preferred_date (formatted as `YYYY/MM/DD`), preferred_time, status label `已確認`
- [ ] HTML special characters in all user-supplied fields are escaped

### AC-03: Email Notification on Cancellation

- [ ] When landlord sets appointment status to `cancelled`, tenant email is sent automatically
- [ ] Email subject: `[RESA AI] 看房預約已取消 — {propertyTitle}`
- [ ] If `feedback` is provided, cancellation reason block is included in the email body
- [ ] If `feedback` is empty/null, no reason block is rendered

### AC-04: Email Notification on Completion

- [ ] When landlord sets appointment status to `completed`, tenant email is sent automatically
- [ ] Email subject: `[RESA AI] 看房預約已完成 — {propertyTitle}`

### AC-05: API Route

- [ ] `PATCH /api/landlord/appointments/[id]` accepts `{ status, feedback? }` payload
- [ ] On status update to `confirmed | cancelled | completed`, email notification is triggered
- [ ] Returns updated appointment object on success
- [ ] Returns 404 if appointment does not belong to requesting landlord
- [ ] Returns 400 for invalid status transitions

---

## 4. Out of Scope (Row 029)

- Appointment creation flow (tenant side)
- Reminder/follow-up emails (future row)
- SMS notifications
- Push notifications

---

## 5. Test Mapping

| TDD ID | Acceptance Criteria | Test Type   |
|--------|----------------------|-------------|
| T-08   | AC-02, AC-03, AC-04  | Integration |
| T-09   | AC-01                | E2E         |

### Unit Test Checklist (AC-02 / AC-03 / AC-04)

- `sendViewingAppointmentStatusEmail` called with `status: 'confirmed'` → email sent, returns `true`
- `sendViewingAppointmentStatusEmail` called with `status: 'cancelled'` + feedback → email contains reason block
- `sendViewingAppointmentStatusEmail` called with `status: 'cancelled'` + no feedback → no reason block in email
- HTML injection in `tenantName`/`propertyTitle`/`propertyAddress`/`feedback` is escaped

### Unit Test Checklist (AC-01)

- `getCalendarDays(monthDate)` returns full grid from Sunday before month start to Saturday after month end
- `groupAppointmentsByDate(items)` groups correctly by `preferred_date` and sorts by `preferred_time`

### E2E Test Checklist (AC-01)

- Navigate to `/landlord/appointments` → calendar renders without error
- Switch month forward and back → correct month is displayed
- Appointment from fixture data appears in correct day cell

---

## 6. Done Definition

Row 029 is **done** when:

1. All AC-01 through AC-05 criteria are met
2. Unit tests for `appointment-notifications.ts` and `appointment-calendar.ts` pass
3. E2E test for calendar view passes
4. TDD Progress Report written at `project-process/test-logs/test-landlord-viewing-appointments-*.md`
5. All changes committed on `feature/paperclip-row-029` branch
