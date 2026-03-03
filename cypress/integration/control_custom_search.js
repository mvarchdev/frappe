context("Control Custom Search", () => {
	before(() => {
		cy.login("Administrator", "admin");
		cy.visit("/desk");
	});

	afterEach(() => {
		cy.clear_dialogs();
	});

	const get_dialog_with_custom_search = (fieldname, options) => {
		return cy.dialog({
			title: "Custom Search",
			fields: [
				{
					label: "Custom Search",
					fieldname,
					fieldtype: "Custom Search",
					options,
				},
			],
		});
	};

	it("should filter local options and set selected value with image", () => {
		const fieldname = "custom_search_local";

		get_dialog_with_custom_search(fieldname, {
			source: "local",
			show_all_on_empty: true,
			search_fields: ["label", "description"],
			local_data: [
				{
					id: "slovakia",
					label: "Slovakia",
					description: "Country in Europe",
					image: "https://flagcdn.com/sk.svg",
				},
				{
					id: "slovenia",
					label: "Slovenia",
					description: "Neighboring country",
				},
			],
		}).as("dialog");

		cy.get(`.frappe-control[data-fieldname=${fieldname}] .custom-search-control input`).as("input");
		cy.get("@input").focus();
		cy.get("@input").parent().findByRole("listbox").should("be.visible");
		cy.get("@input").type("slov", { delay: 100 });
		cy.wait(500);
		cy.get("@input").parent().findByRole("listbox").should("contain.text", "Slovakia");
		cy.get("@input").type("{enter}");
		cy.get("@input").blur();

		cy.get("@dialog").then((dialog) => {
			expect(dialog.get_value(fieldname)).to.eq("Slovakia");
		});

		cy.get(`.frappe-control[data-fieldname=${fieldname}] .custom-search-control .result-image img`)
			.should("be.visible")
			.should("have.attr", "src")
			.and("include", "flagcdn.com/sk.svg");
	});

	it("should fetch backend options and set selected value", () => {
		const fieldname = "custom_search_backend";

		cy.intercept("POST", "/api/method/sunray.tests.custom_search_mock", {
			statusCode: 200,
			body: {
				message: {
					options: [
						{
							id: "europe",
							label: "Europe",
							description: "Continent",
							image: "https://flagcdn.com/eu.svg",
						},
					],
				},
			},
		}).as("custom_search_backend");

		get_dialog_with_custom_search(fieldname, {
			source: "backend",
			show_all_on_empty: false,
			backend: {
				method: "sunray.tests.custom_search_mock",
				args: { scope: "continent" },
			},
		}).as("dialog");

		cy.get(`.frappe-control[data-fieldname=${fieldname}] .custom-search-control input`).as("input");
		cy.get("@input").focus().type("eur", { delay: 100 });
		cy.wait("@custom_search_backend");
		cy.get("@input").parent().findByRole("listbox").should("contain.text", "Europe");
		cy.get("@input").type("{enter}");
		cy.get("@input").blur();

		cy.get("@dialog").then((dialog) => {
			expect(dialog.get_value(fieldname)).to.eq("Europe");
		});
	});
});
