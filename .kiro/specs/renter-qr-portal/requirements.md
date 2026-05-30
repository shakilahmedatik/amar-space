# Requirements Document

## Introduction

The Renter QR Portal is the primary digital entry point for renters, visitors, and building stakeholders. Each flat in a building has a unique QR code that, when scanned, redirects to a mobile-first, Bangla-first portal at `/f/{flatSlug}`. The portal serves as a public information hub, renter registration entry point, existing renter access point, notice board, emergency contact center, and building communication center. The experience must be intuitive enough for elderly, non-technical users with zero training required.

## Glossary

- **Portal**: The web page rendered when a flat QR code is scanned, accessible at `/f/{flatSlug}`
- **Flat_Slug**: A URL-friendly unique identifier for a flat (e.g., `building-a-flat-4a`, `b1-4a`)
- **Renter**: A person currently occupying a flat with an active rental agreement
- **Visitor**: Any person scanning the QR code who is not a registered renter
- **Building_Manager**: The person responsible for managing the building operations
- **Access_Code**: A 6-digit numeric code issued to registered renters for dashboard access
- **Flat_Status**: The current state of a flat: AVAILABLE, OCCUPIED, or MAINTENANCE
- **Notice**: A public announcement posted by the building manager
- **Registration_Request**: A submission by a prospective renter with status PENDING_APPROVAL
- **Quick_Action**: A large touch-friendly button providing one-tap access to key functions
- **Renter_Dashboard**: The authenticated area accessible after access code verification at `/renter/dashboard`

## Requirements

### Requirement 1: QR Code URL Resolution

**User Story:** As a visitor, I want to scan a flat's QR code and be taken directly to the flat's portal page, so that I can access building and flat information instantly.

#### Acceptance Criteria

1. WHEN a user navigates to `/f/{flatSlug}`, THE Portal SHALL resolve the flat slug and render the corresponding flat portal page within 2 seconds
2. IF the flat slug does not match any registered flat, THEN THE Portal SHALL display the error message "ফ্ল্যাটটি পাওয়া যায়নি" accompanied by an error icon and a visually distinct error container
3. IF the flat slug contains characters outside the allowed set (lowercase letters, digits, and hyphens) or exceeds 100 characters in length, THEN THE Portal SHALL display the error message "অবৈধ QR কোড" without performing a database lookup
4. THE Portal SHALL render using server-side rendering for fast first load and SEO compatibility
5. THE Portal SHALL accept flat slugs containing only lowercase alphanumeric characters (a-z, 0-9) and hyphens, with a minimum length of 1 character and a maximum length of 100 characters

### Requirement 2: Building Header Display

**User Story:** As a visitor, I want to see the building name, flat number, and status at the top of the portal, so that I can confirm I am viewing the correct flat.

#### Acceptance Criteria

1. THE Portal SHALL display the building name (maximum 100 characters, truncated with ellipsis if exceeded), flat number (maximum 20 characters), and flat status badge at the top of the page
2. WHEN the flat status is AVAILABLE, THE Portal SHALL display a green status badge with the Bangla label "খালি"
3. WHEN the flat status is OCCUPIED, THE Portal SHALL display a blue status badge with the Bangla label "ভাড়া হয়েছে"
4. WHEN the flat status is MAINTENANCE, THE Portal SHALL display an orange status badge with the Bangla label "রক্ষণাবেক্ষণ"
5. WHERE a building logo or cover image is configured, THE Portal SHALL display the image in the header section scaled to fit within a maximum width of 120px for logos and full header width for cover images while preserving aspect ratio
6. IF the flat status value is not one of AVAILABLE, OCCUPIED, or MAINTENANCE, THEN THE Portal SHALL display a grey status badge with the Bangla label "অজানা"
7. IF the building name or flat number data is unavailable, THEN THE Portal SHALL display a placeholder text "তথ্য পাওয়া যায়নি" in place of the missing field

### Requirement 3: Quick Actions Grid

**User Story:** As a renter or visitor, I want large, easy-to-tap action buttons, so that I can quickly access WhatsApp groups, call the manager, view emergency contacts, or read notices.

#### Acceptance Criteria

1. THE Portal SHALL display quick action buttons in a 2-column grid layout with a minimum touch target size of 48x48px
2. THE Portal SHALL include a "হোয়াটসঅ্যাপ গ্রুপে যোগ দিন" (Join WhatsApp Group) button that opens the configured WhatsApp group link in a new tab or the WhatsApp app
3. IF no WhatsApp group link is configured for the building, THEN THE Portal SHALL hide the WhatsApp Group button
4. THE Portal SHALL include a "ম্যানেজারকে কল করুন" (Call Manager) button that initiates a phone call via tel: link to the building manager's phone number
5. IF no manager phone number is configured, THEN THE Portal SHALL hide the Call Manager button
6. THE Portal SHALL include a "জরুরি যোগাযোগ" (Emergency Contacts) button that scrolls to the emergency contacts section
7. THE Portal SHALL include a "নোটিশ" (Notices) button that scrolls to the notice board section
8. WHEN a user taps the WhatsApp Group button, THE Portal SHALL track a "WhatsApp Clicked" analytics event

### Requirement 4: Notice Board

**User Story:** As a renter or visitor, I want to view building notices sorted by most recent, so that I stay informed about building announcements.

#### Acceptance Criteria

1. THE Portal SHALL display notices in reverse chronological order with title, date in "DD MMM YYYY" format (Bangla numerals and month names), and a description truncated to a maximum of 120 characters
2. THE Portal SHALL display a maximum of 20 notices at a time, with the most recent notices shown first
3. WHEN a user taps a notice card, THE Portal SHALL expand the card to show the full notice content
4. WHEN a user taps an expanded notice card, THE Portal SHALL collapse the card back to its truncated state
5. WHEN no notices exist, THE Portal SHALL display the empty state message "কোনো নোটিশ নেই"
6. WHEN a user expands a notice, THE Portal SHALL track a "Notice Viewed" analytics event

### Requirement 5: Emergency Contacts

**User Story:** As a renter or visitor, I want to quickly find and call emergency contacts, so that I can get help in urgent situations.

#### Acceptance Criteria

1. THE Portal SHALL display emergency contacts in the following order: Owner, Manager, Caretaker, Security, with each contact showing name, role (in Bangla), and phone number
2. WHERE nearby Hospital, Police Station, or Fire Service contacts are configured, THE Portal SHALL display those contacts below the building contacts with name, role, and phone number
3. THE Portal SHALL provide a "কল করুন" (Call) button for each emergency contact that initiates a phone call via tel: link
4. IF an emergency contact does not have a phone number configured, THEN THE Portal SHALL display the contact name and role without a call button
5. IF no emergency contacts are configured, THEN THE Portal SHALL display the empty state message "কোনো জরুরি যোগাযোগ নেই"
6. WHEN a user taps an emergency contact call button, THE Portal SHALL track an "Emergency Contact Clicked" analytics event

### Requirement 6: Building Information

**User Story:** As a renter or visitor, I want to read the building rules, so that I understand the community guidelines.

#### Acceptance Criteria

1. THE Portal SHALL display building rules with rich text formatting support including headings, bold, italic, bulleted lists, numbered lists, and hyperlinks
2. IF no building rules are configured, THEN THE Portal SHALL hide the building information section entirely
3. THE Portal SHALL display building rules content up to 50,000 characters, rendering inline within a scrollable container if content exceeds the visible viewport
4. WHEN a user navigates to the building information section, THE Portal SHALL render the full rules content without requiring additional network requests after initial page load

### Requirement 7: Renter Registration (Available Flat)

**User Story:** As a prospective renter, I want to submit a registration request when a flat is available, so that I can apply to rent the flat.

#### Acceptance Criteria

1. WHILE the flat status is AVAILABLE, THE Portal SHALL display a registration call-to-action and form
2. THE Portal SHALL collect the following required fields with validation: Full Name (1–100 characters), Phone (valid Bangladeshi mobile number, 11 digits starting with 01), NID (10 or 17 digit national ID number), Blood Group (one of A+, A−, B+, B−, O+, O−, AB+, AB−), Occupation (1–100 characters), Family Members count (integer between 1 and 20), Emergency Contact (valid Bangladeshi mobile number, 11 digits starting with 01), Rental Start Date (must be a current or future date within 90 days), Advance Amount (numeric value between 0 and 99,999,999 in BDT), and Digital Signature (a drawn signature captured via touch input with minimum 1 stroke)
3. WHERE the user chooses to upload an NID photo, THE Portal SHALL accept the optional NID photo attachment in JPEG or PNG format with a maximum file size of 5 MB
4. WHEN a user begins filling the registration form, THE Portal SHALL track a "Registration Started" analytics event
5. WHEN a user submits a valid registration form, THE Portal SHALL create a Registration_Request with PENDING_APPROVAL status
6. WHEN a user submits a valid registration form, THE Portal SHALL track a "Registration Submitted" analytics event
7. IF the registration form contains invalid or missing required fields, THEN THE Portal SHALL display field-level validation errors in Bangla adjacent to each invalid field and prevent form submission
8. WHILE the flat status is MAINTENANCE, THE Portal SHALL hide the registration form and display a maintenance message
9. IF a Registration_Request with PENDING_APPROVAL status already exists for the same Phone number and flat, THEN THE Portal SHALL prevent duplicate submission and display a message indicating a pending request already exists

### Requirement 8: Renter Access (Occupied Flat)

**User Story:** As an existing renter, I want to enter my access code to reach my dashboard, so that I can manage my rental information.

#### Acceptance Criteria

1. WHILE the flat status is OCCUPIED, THE Portal SHALL display a 6-digit numeric access code input field that accepts only numeric characters (0-9) and ignores non-numeric input
2. WHEN a renter enters a valid 6-digit access code, THE Portal SHALL create a session with a duration of 30 minutes and redirect to `/renter/dashboard`
3. IF a renter enters an invalid access code, THEN THE Portal SHALL display an error message in Bangla, clear the input field, and track an "Access Code Attempted" analytics event
4. WHEN a renter successfully authenticates, THE Portal SHALL track an "Access Granted" analytics event
5. IF a renter enters an invalid access code 5 consecutive times, THEN THE Portal SHALL disable the access code input for 15 minutes and display a lockout message in Bangla
6. IF the session expires after 30 minutes of inactivity, THEN THE Portal SHALL redirect the renter back to the flat portal page at `/f/{flatSlug}`

### Requirement 9: Data Privacy and Security

**User Story:** As a building manager, I want to ensure private renter data is never exposed on the public portal, so that renter privacy is protected.

#### Acceptance Criteria

1. THE Portal SHALL restrict publicly visible data to: building name, flat number, public notices, emergency contacts, WhatsApp group link, building rules, and availability status
2. THE Portal SHALL exclude from public view and from unauthenticated API responses and server-rendered HTML source: NID numbers, payment history, rent details, family information, contract information, deposit information, issue reports, and private notices
3. THE Portal SHALL enforce server-side authentication checks on every API endpoint that serves private renter data, ensuring no private data is returned unless the requester has a valid authenticated session
4. IF an unauthenticated or unauthorized request attempts to access private renter data, THEN THE Portal SHALL deny the request, return no private data in the response, and log the failed access attempt

### Requirement 10: Accessibility and Mobile Optimization

**User Story:** As an elderly or non-technical user, I want the portal to be easy to read and interact with on my phone, so that I can use it without assistance.

#### Acceptance Criteria

1. THE Portal SHALL use a minimum font size of 16px for all text content
2. THE Portal SHALL use a minimum touch target size of 48x48px (width and height) for all interactive elements, with a minimum spacing of 8px between adjacent targets
3. THE Portal SHALL meet WCAG AA contrast ratio requirements: a minimum contrast ratio of 4.5:1 for normal text (below 18px bold or 24px regular) and 3:1 for large text (18px bold or 24px regular and above)
4. THE Portal SHALL display Bangla as the primary language for all labels, messages, and UI text
5. THE Portal SHALL include icons alongside text for all interactive elements
6. THE Portal SHALL render without horizontal scrolling, without overlapping elements, and without text truncation on viewports from 360px wide up to 768px wide
7. THE Portal SHALL function without errors on the latest two major versions of Android Chrome, Samsung Internet, and iPhone Safari, where "function" means all interactive elements respond to user input and all content is visible and readable
8. THE Portal SHALL not require multi-finger gestures, long-press, or swipe interactions for any primary functionality
9. THE Portal SHALL support pinch-to-zoom without layout breakage, allowing users to zoom up to 200% of the default scale

### Requirement 11: Loading States and Error Handling

**User Story:** As a user, I want clear feedback during loading and errors, so that I am never confused by a blank or unresponsive screen.

#### Acceptance Criteria

1. WHILE an asynchronous action is in progress, THE Portal SHALL display a loading indicator within 200ms of the action starting
2. WHEN an asynchronous action completes successfully, THE Portal SHALL replace the loading indicator with the result content within 100ms
3. IF an asynchronous action fails, THEN THE Portal SHALL display an error message in Bangla with a "আবার চেষ্টা করুন" (Retry) button that re-triggers the failed action
4. WHEN a data section has no content, THE Portal SHALL display an appropriate empty state message in Bangla with a relevant icon
5. THE Portal SHALL never display a blank screen or section without a loading indicator, error message, or empty state message

### Requirement 12: Performance

**User Story:** As a user on a mobile network, I want the portal to load quickly, so that I can access information without waiting.

#### Acceptance Criteria

1. THE Portal SHALL achieve a Largest Contentful Paint (LCP) of 2 seconds or less and a First Contentful Paint (FCP) of 1 second or less on a simulated 4G mobile connection (download 9 Mbps, upload 9 Mbps, 170ms RTT)
2. THE Portal SHALL lazy-load images that are positioned below the visible viewport on initial render, so that the initial page transfer size does not exceed 500 KB (compressed)
3. THE Portal SHALL deliver a total JavaScript bundle size of no more than 200 KB (compressed/transferred) per page load
4. THE Portal SHALL complete all API requests needed for initial page render in no more than 3 network round trips

### Requirement 13: Analytics Tracking

**User Story:** As a building manager, I want to track portal usage, so that I can understand how renters and visitors interact with the system.

#### Acceptance Criteria

1. WHEN a user lands on the portal via QR code scan, THE Portal SHALL track a "QR Scanned" analytics event containing flat_slug, timestamp, and user_agent
2. THE Portal SHALL track the following events with flat_slug and timestamp: QR Scanned, Registration Started, Registration Submitted, Access Code Attempted, Access Granted, WhatsApp Clicked, Emergency Contact Clicked, Notice Viewed
3. THE Portal SHALL send analytics events asynchronously without blocking user interactions, ensuring no visible delay or degradation in page responsiveness
4. IF an analytics event fails to send, THEN THE Portal SHALL silently discard the event without displaying an error to the user or retrying in a way that impacts performance
