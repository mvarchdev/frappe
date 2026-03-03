describe("Communication reply draft handling", () => {
	before(() => {
		cy.login("Administrator", "admin");
		cy.visit("/desk/note/new");
		cy.window().then((win) => {
			return win
				.fetch("/assets/frappe/js/frappe/views/communication.js")
				.then((response) => response.text())
				.then((source) => {
					const patched_source = source.replace(
						'import localforage from "localforage";',
						"const localforage = window.localforage || {setItem: () => Promise.resolve(), removeItem: () => Promise.resolve(), getItem: () => Promise.resolve(null)};"
					);
					win.eval(patched_source);
				});
		});
		cy.window().its("frappe.views.CommunicationComposer").should("exist");
	});

	it("replaces legacy separator quote blocks in saved reply drafts", () => {
		cy.window().then((win) => {
			const composer_prototype = win.frappe.views.CommunicationComposer.prototype;
			const draft = {
				content: "Draft content<div><br><br></div><blockquote>stale quote</blockquote>",
				html_content: "Draft content<div><br><br></div><blockquote>stale quote</blockquote>",
			};

			const fake_composer = Object.create(composer_prototype);
			Object.assign(fake_composer, {
				message: "",
				is_a_reply: true,
				content_set: false,
				dialog: {
					fields_dict: {},
					set_values: () => Promise.resolve(),
				},
				get_last_edited_communication: () => draft,
				get_earlier_reply: () => "<div>---</div><blockquote>fresh quote</blockquote>",
			});

			return composer_prototype.set_values_from_last_edited_communication
				.call(fake_composer)
				.then(() => {
					expect(draft.content).to.equal(
						"Draft content<div>---</div><blockquote>fresh quote</blockquote>"
					);
					expect(draft.html_content).to.equal(
						"Draft content<div>---</div><blockquote>fresh quote</blockquote>"
					);
					expect(fake_composer.content_set).to.equal(true);
				});
		});
	});

});
