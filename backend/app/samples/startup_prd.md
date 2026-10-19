# Product Requirements Document: QuickBite Campus Express

**Version:** 1.0  
**Owner:** Campus Launch Team  
**Status:** Approved for Q1 Implementation  
**Target Launch:** 3 months from kickoff  

---

## 1. Executive Summary & Goal
QuickBite Campus Express is an ultra-fast on-campus food ordering and delivery service tailored specifically for university dormitories, academic buildings, and campus libraries. The service promises hot, fresh meals delivered to student dorm rooms within an aggressive delivery SLA of 20 minutes from the moment payment completes.

Our primary goal is to dominate campus dining by achieving 1,000 daily orders within the first 6 weeks of launch across North and South Campus dormitories.

---

## 2. Target Audience & Stakeholders
- **Primary Consumers:** 12,000 undergraduate and graduate students living across 8 residential dormitories.
- **Vendors:** Campus cafeteria and local commercial eateries situated along University Avenue.
- **Delivery Staff:** A dedicated student-courier fleet comprising exactly 2 full-time student delivery partners operating electric bicycles during operational hours (11:00 AM - 11:00 PM).
- **Operations Manager:** 1 campus lead coordinating daily vendor inventory.

---

## 3. Financials, Timeline & Budget
- **Total Development & Operational Runway Budget:** ₹2,00,000 (2 Lakh Rupees) all-inclusive for software engineering, cloud infrastructure, merchant onboarding, marketing collateral, and third-party logistics.
- **Implementation Timeline:** Strictly 3 months to production readiness.
- **External Services & APIs:** The app will integrate Google Maps Platform Distance Matrix and Geocoding APIs at enterprise pay-as-you-go rates to track courier positions in real-time.

---

## 4. Key Functional Features
1. **Menu Browsing & Cart Management:** Dynamic live menus showing partner offerings with instant item customisation.
2. **One-Tap Checkout:** Direct checkout via UPI and credit/debit gateway. Once payment succeeds, the order status immediately transitions to "In Kitchen" and the 20-minute countdown timer begins on the student's screen.
3. **Continuous Background Geolocation:** The mobile app continuously pings and records high-frequency GPS coordinates from the customer's phone in the background to pinpoint exact dorm stairwells, common rooms, and campus quads.
4. **Automated Order Dispatch:** Dispatches orders straight to the 2-person delivery team queue with route optimization.

---

## 5. Stated Assumptions & Dependencies
- **Campus Density:** The concentration of student dorms ensures transit times between any two campus points remain under 5 minutes.
- **Merchant Cooperation:** All cafeteria stalls will package orders within 7 minutes of digital receipt.
- **Payment Success:** All student UPI transactions will clear instantly via gateway webhooks.
- **Map Accuracy:** Standard street mapping accurately distinguishes pedestrian pathways between university dorm towers.

---

## 6. Stated Constraints & Known Risks
- **Vehicle Restriction:** Motorized scooters and cars are prohibited inside the pedestrian central quad; deliveries must rely exclusively on the 2 electric bicycle couriers.
- **Dorm Security:** Curfew locks dorm exterior gates at 11:00 PM nightly.
