describe("Communication reply actions", () => {
	before(() => {
		cy.login("Administrator", "admin");
		cy.visit("/desk/Form/Communication/new-communication-1");
		cy.window().its("cur_frm.events.reply").should("exist");
	});

	it("uses original recipients for sent communications when replying", () => {
		cy.window().then((win) => {
			const handlers = win.cur_frm.events;
			const original_composer = win.frappe.views.CommunicationComposer;
			const captured = [];

			try {
				win.frappe.views.CommunicationComposer = function (args) {
					captured.push(args);
				};

				const frm = {
					doc: {
						doctype: "Communication",
						name: "COMM-TEST-REPLY",
						subject: "Status update",
						sent_or_received: "Sent",
						sender: "sales@example.com",
						recipients: "customer@example.com",
						cc: "manager@example.com",
						email_account: "",
					},
					events: handlers,
				};

				handlers.reply(frm);
				handlers.reply_all(frm);

				expect(captured).to.have.length(2);
				expect(captured[0].recipients).to.equal("customer@example.com");
				expect(captured[1].recipients).to.equal("customer@example.com");
				expect(captured[1].cc).to.equal("manager@example.com");
			} finally {
				win.frappe.views.CommunicationComposer = original_composer;
			}
		});
	});

	it("hides reply and reply-all for linked email communications", () => {
		cy.window().then((win) => {
			const handlers = win.cur_frm.events;
			const added_buttons = [];

			const frm = {
				doc: {
					doctype: "Communication",
					name: "COMM-TEST-LINKED",
					communication_type: "Communication",
					communication_medium: "Email",
					sent_or_received: "Received",
					status: "Linked",
					seen: 1,
					email_status: "Open",
				},
				convert_to_click: false,
				is_new: () => false,
				set_df_property: () => {},
				add_custom_button: (label, _handler, group) => {
					added_buttons.push({ label, group: group || null });
				},
				trigger: () => {},
			};

			handlers.refresh(frm);

			expect(added_buttons.some((button) => button.label === "Reply")).to.equal(false);
			expect(
				added_buttons.some((button) => button.label === "Reply All" && button.group === "Actions")
			).to.equal(false);
			expect(
				added_buttons.some((button) => button.label === "Forward" && button.group === "Actions")
			).to.equal(true);
		});
	});
});
