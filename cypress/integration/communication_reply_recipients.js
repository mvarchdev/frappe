describe("Communication reply recipients", () => {
	before(() => {
		cy.login();
		cy.visit("/desk/note/new");
	});

	it("uses original recipients when replying to a sent timeline communication", () => {
		cy.window().then((win) => {
			const timeline_prototype = Object.getPrototypeOf(win.cur_frm.timeline);
			const original_composer = win.frappe.views.CommunicationComposer;
			let captured_args = null;

			try {
				win.frappe.views.CommunicationComposer = function (args) {
					captured_args = args;
				};

				const fake_timeline = {
					frm: {
						doctype: "ToDo",
						doc: {},
						comment_box: { get_value: () => "" },
						email_field: "email_id",
					},
					get_recipient() {
						return "fallback@example.com";
					},
					normalize_email: timeline_prototype.normalize_email,
				};

				timeline_prototype.compose_mail.call(
					fake_timeline,
					{
						sent_or_received: "Sent",
						sender: "Sales Team <sales@example.com>",
						recipients: "customer@example.com",
						subject: "Hello",
						cc: "",
						bcc: "",
					},
					false
				);

				expect(captured_args).to.not.equal(null);
				expect(captured_args.recipients).to.equal("customer@example.com");
			} finally {
				win.frappe.views.CommunicationComposer = original_composer;
			}
		});
	});

	it("normalizes sender identity when determining reply recipients", () => {
		cy.window().then((win) => {
			const composer_prototype = win.frappe.views.CommunicationComposer.prototype;
			const fake_composer = Object.create(composer_prototype);

			Object.assign(fake_composer, {
				forward: false,
				recipients: "",
				reply_all: false,
				subject: "",
				sender: "sales@example.com",
				frm: null,
				last_email: {
					sent_or_received: "Received",
					sender: "Sales Team <sales@example.com>",
					recipients: "customer@example.com",
					cc: "",
					bcc: "",
				},
			});

			composer_prototype.setup_subject_and_recipients.call(fake_composer);
			expect(fake_composer.recipients).to.equal("customer@example.com");
		});
	});
});
