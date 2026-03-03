describe("Communication inbound sanitization", () => {
	before(() => {
		cy.login("Administrator", "admin");
		cy.visit("/desk/website");
	});

	it("removes script-like tags from HTML previews", () => {
		cy.window().then((win) => {
			const html =
				"<html><head><title>Title</title></head><body><script>alert(1)</script><noscript>x</noscript><p>Safe</p></body></html>";
			const sanitized = win.frappe.dom.remove_script(html);

			expect(sanitized).to.not.include("<script");
			expect(sanitized).to.not.include("<noscript");
			expect(sanitized).to.not.include("<title");
			expect(sanitized).to.include("<p>Safe</p>");
		});
	});

	it("renders communication content inside sandboxed iframe preview", () => {
		const subject = `Cypress Inbound Sanitization ${Date.now()}`;

		cy.insert_doc("Communication", {
			communication_type: "Communication",
			communication_medium: "Email",
			sent_or_received: "Received",
			status: "Open",
			email_status: "Open",
			sender: "sender@example.com",
			recipients: "recipient@example.com",
			subject,
			content: "<p>Start</p><script>alert(2)</script><p>End</p>",
		}).then((doc) => {
			cy.visit(`/desk/communication/${doc.name}`);
			cy.get("body")
				.should("have.attr", "data-route")
				.and("eq", `Form/Communication/${doc.name}`);

			cy.get('.frappe-control[data-fieldname="content"] iframe[title="Email Preview"]').then(
				($iframe) => {
					expect($iframe).to.have.length(1);
					expect($iframe.attr("sandbox")).to.equal("");
					expect($iframe.prop("srcdoc")).to.include("<p>Start</p>");
					expect($iframe.prop("srcdoc")).to.include("<p>End</p>");
					expect($iframe.prop("srcdoc")).to.not.include("<script");
				}
			);

			cy.remove_doc("Communication", doc.name, true);
		});
	});
});
