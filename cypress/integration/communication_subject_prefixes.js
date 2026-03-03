describe("Communication subject prefixes", () => {
	before(() => {
		cy.login("Administrator", "admin");
	});

	it("passes reply type metadata from communication form actions", () => {
		cy.visit("/desk/Form/Communication/new-communication-1");
		cy.window().its("cur_frm.events.reply").should("exist");
		cy.window().its("frappe.views.CommunicationComposer").should("exist");

		cy.window()
			.should((win) => {
				expect(win.cur_frm && win.cur_frm.events).to.exist;
			})
			.then((win) => {
			const events = win.cur_frm.events;
			const original_composer = win.frappe.views.CommunicationComposer;
			const captured = [];
			win.frappe.constants = win.frappe.constants || {};
			win.frappe.constants.communication = {
				email_reply_type: {
					REPLY: "REPLY",
					REPLY_ALL: "REPLY_ALL",
					FORWARD: "FORWARD",
				},
			};

			try {
				win.frappe.views.CommunicationComposer = function (args) {
					captured.push(args);
				};

				const frm = {
					doc: {
						doctype: "Communication",
						name: "COMM-TEST-SUBJECT",
						subject: "Re: Fwd: Project Update",
						sender: "sender@example.com",
						recipients: "recipient@example.com",
						cc: "cc@example.com",
						email_account: "",
						sent_or_received: "Received",
					},
					events,
				};

				events.reply(frm);
				events.reply_all(frm);
				events.forward_mail(frm);

				expect(captured).to.have.length(3);
				expect(captured[0].reply_type).to.equal("REPLY");
				expect(captured[1].reply_type).to.equal("REPLY_ALL");
				expect(captured[2].reply_type).to.equal("FORWARD");
				expect(captured[0].subject).to.equal("Re: Fwd: Project Update");
				expect(captured[0].current_replyto_email).to.equal(frm.doc);
				expect(captured[0]).to.not.have.property("last_email");
			} finally {
				win.frappe.views.CommunicationComposer = original_composer;
			}
			});
	});
});
