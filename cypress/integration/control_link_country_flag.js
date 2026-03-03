context("Control Link country flag", () => {
	beforeEach(() => {
		cy.login("Administrator", "admin");
		cy.visit("/desk/website");
	});

	function get_dialog_with_country_link() {
		return cy.dialog({
			title: "Country Link",
			fields: [
				{
					label: "Country",
					fieldname: "country",
					fieldtype: "Link",
					options: "Country",
				},
			],
		});
	}

	function get_country_with_iso_code() {
		return cy.get_list("Country", ["name", "code"]).then((res) => {
			const countries = res.data || [];
			const country = countries.find((row) => /^[a-z]{2}$/i.test((row.code || "").trim()));
			expect(country, "country with two-letter ISO code").to.exist;
			return country;
		});
	}

	it("shows country flag for selected country", () => {
		get_country_with_iso_code().then((country) => {
			get_dialog_with_country_link().as("dialog");

			cy.intercept("GET", "**/api/method/frappe.client.get_value**", (req) => {
				if (req.query.doctype === "Country" && req.query.fieldname === "code") {
					req.alias = "country_code";
					req.reply({
						statusCode: 200,
						body: { message: { code: country.code.toUpperCase() } },
					});
				}
			});

			cy.get("@dialog").then((dialog) => {
				dialog.get_field("country").update_country_flag(country.name);
			});
			cy.wait("@country_code");

			cy.get("@dialog").then((dialog) => {
				const field = dialog.get_field("country");
				expect(field.country_code_cache[country.name]).to.equal(country.code.toLowerCase());
				expect(field.$country_flag.find("img").attr("src")).to.include(
					`flagcdn.com/${country.code.toLowerCase()}.svg`
				);
			});
		});
	});

	it("does not render stale flag after field is cleared before response", () => {
		get_country_with_iso_code().then((country) => {
			get_dialog_with_country_link().as("dialog");

			cy.intercept("GET", "**/api/method/frappe.client.get_value**", (req) => {
				if (req.query.doctype === "Country" && req.query.fieldname === "code") {
					req.alias = "country_code";
					req.reply({
						delay: 400,
						statusCode: 200,
						body: { message: { code: country.code.toUpperCase() } },
					});
				}
			});

			cy.get("@dialog").then((dialog) => {
				const field = dialog.get_field("country");
				field.update_country_flag(country.name);
				field.update_country_flag("");
			});
			cy.wait("@country_code");

			cy.get(".frappe-control[data-fieldname=country] .country-flag").last().should("not.be.visible");
			cy.get(".frappe-control[data-fieldname=country] .country-flag").last().find("img").should("not.exist");
		});
	});
});
