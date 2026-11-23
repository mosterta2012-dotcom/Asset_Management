Angels Asset Management (QMS-05) - design screens (source files)
November 2026 · approved design; the working web app is in app/


These .dc.html files are the source of each screen on the design canvas.
They are for the developer (see the Asset Management Module Development Briefing, section 6),
and need the canvas runtime to display; open the live canvas link to view them.
Static copies (no runtime needed) are in app/screens/ and open from the web app menu (Design → Prototype screens).
Values in [square brackets] are placeholders or decisions still open.

Live canvas: https://claude.ai/artifact/UnWM2a7MVh2SNWDwzTcfzi

Screens                                        Web app prototype       Working page
 1   Main.dc.html            Asset Management home              home-design            #/home
 2   Request.dc.html         New request (laptop, step 2)       request-design         #/new-request
 2b  Funding.dc.html         Request step 3: why, when, who pays, delivery   funding-design   #/new-request
 2c  Order.dc.html           Order: Payment Request, supplier, PO, delivery  order-design     #/payments
 3   Approval.dc.html        Approval / tech check              approval-design        #/approvals
 3b  Receive.dc.html         Receive, PCZEN prep & Anton's check   receive-design      #/request/<id>
 3c  Sign.dc.html            Staff member signs on screen       sign-design            #/request/<id>
 4   Register.dc.html        Asset register (funding, owner, insurance)   register-design   #/register
 5   Handover.dc.html        Equipment Issue & Acknowledgement, page 1 (A4)   handover-design   #/handover/<id>
 5   HandoverPhotos.dc.html  Equipment Issue & Acknowledgement, page 2 (photos & record)   handover-photos
 6   Report.dc.html          Report a problem (staff)           report-design          #/report-problem
 7   Incident.dc.html        Incident case (Anton / Annemarie)  incident-design        #/incident/<id>
 8   Reports.dc.html         Monthly report & PCZEN turnaround  reports-design         #/reports
 9   Logistics.dc.html       Deliveries and collections         deliveries-design      #/deliveries
 10  Store.dc.html           Training & marketing store + calendar   store-design      #/store
 10b Booking.dc.html         Store booking: check-out and return     booking-design    #/booking/<id>
 11  Donations.dc.html       Donations and transfers (incl. donation received)   donations-design   #/donations
 11b DonationOut.dc.html     Donate or transfer out             donation-out-design    #/disposal/<id>
 11c DonationCert.dc.html    Donation or Transfer Certificate (A4)   donation-cert-design   #/disposal/<id>
