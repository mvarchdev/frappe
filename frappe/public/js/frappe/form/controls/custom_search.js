import Awesomplete from "awesomplete";
frappe.ui.form.recent_link_validations = {};

frappe.ui.form.ControlCustomSearch = class ControlCustomSearch extends frappe.ui.form.ControlData {
	static trigger_change_on_input_event = false;
	first_run = true;

	/** Called when input is created. */
	make_input() {
		this._init_options();
		this._make_html_structure();
		this.set_input_attributes();
		this.has_input = true;
		this.bind_change_event();
		this.setup_awesomeplete();
	}

	/** Called on refresh, triggers on_show actions if first run. */
	refresh_input() {
		super.refresh_input();

		if (this.first_run) {
			this._trigger_on_show();
			if (this.config.on_show_autofetch_image) {
				this._on_show_autofetch_image();
			}
			this.first_run = false;
		}
	}

	/** Initialize and parse df.options into a configuration object. */
	_init_options() {
		this.config = this.df.options || {};
		if (typeof this.config === "string") {
			try {
				this.config = JSON.parse(this.config);
			} catch (e) {
				console.warn("Failed to parse df.options as JSON. Using default config.");
				this.config = {};
			}
		}

		// Default configuration values
		this.config.source = this.config.source || "local";
		this.config.search_fields = this.config.search_fields || ["label", "description"];
		this.config.show_all_on_empty = this.config.show_all_on_empty !== false;
		this.config.loading_enabled = this.config.loading_enabled !== false;
		this.config.on_show_autofetch_image = this.config.on_show_autofetch_image !== false;

		if (this.config.source === "backend") {
			this.config.backend = this.config.backend || {};
			this.config.backend.method = this.config.backend.method || "";
			this.config.backend.debounce = this.config.backend.debounce || 500;
		}

		// Determine on_select function
		this.on_select_fn = this._resolve_function(this.config.on_select, this._default_on_select);

		// Determine on_show function
		this.on_show_fn = this._resolve_function(this.config.on_show, null);

		// Debounce configuration
		this.debounce_time = this.config.debounce ||
			(this.config.source === "backend" ? this.config.backend.debounce : 0);
	}

	/** Resolve a function from config, can be a direct function or a window global by name. */
	_resolve_function(fn_config, default_fn) {
		if (typeof fn_config === "function") {
			return fn_config;
		}
		if (typeof fn_config === "string" && window[fn_config]) {
			return window[fn_config];
		}
		return default_fn;
	}

	/** Default on_select method if none is specified. */
	_default_on_select(option_id) {
		// Default behavior: just log selected option
		console.log("Option selected:", option_id);
	}

	/** Trigger on_show action if defined. */
	_trigger_on_show() {
		if (this.on_show_fn) {
			this.on_show_fn(this);
		}
	}

	/** Create and insert HTML structure for the control. */
	_make_html_structure() {
		const html = `
			<div class="custom-search-control ui-front">
				<input type="text" class="input-with-feedback form-control">
				<span class="field-status-area">
					<span class="loading-icon"></span>
					<span class="result-image"></span>
				</span>
			</div>`;
		$(html).prependTo(this.input_area);

		this.$input_area = $(this.input_area);
		this.$input = this.$input_area.find("input");
		this.$loading_icon = this.$input_area.find(".loading-icon");
		this.$result_image = this.$input_area.find(".result-image");

		this.input = this.$input.get(0);
		this._setup_focus_blur_handlers();
	}

	/** Setup focus and blur handlers to handle show_all_on_empty logic. */
	_setup_focus_blur_handlers() {
		this.$input.on("focus", () => {
			const value = this.get_input_value()?.trim();
			if (this.config.show_all_on_empty && !value) {
				this._fetch_data("").then((response) => {
					if (!this.$input.is(":focus")) return;
					this._hide_loading();
					this._render_results(response);
					this._maybe_open_dropdown();
				});
			}
		});
	}

	/**
	 * If on_show_autofetch_image is enabled and there's a current value, fetch data and attempt
	 * to display an image immediately on show.
	 */
	_on_show_autofetch_image() {
		const value = this.get_input_value()?.trim();
		if (value) {
			this._fetch_data(value, true).then((response) => {
				// When autofetching image on show, we allow fallback to first option's image
				this._render_results(response, {
					only_image: true,
					fallback_to_first_option_image: true
				});
			});
		}
	}

	/** Show loading spinner if enabled. */
	_show_loading() {
		if (this.config.loading_enabled) {
			this.$loading_icon.html('<span class="spinner"></span>').show();
		}
		this.$result_image.hide().empty();
	}

	/** Hide loading spinner. */
	_hide_loading() {
		this.$loading_icon.hide().empty();
	}

	/**
	 * Update displayed image.
	 * @param {string} image - Image URL or Base64 string.
	 * @param {string} link - Optional link to wrap the image.
	 */
	_update_image(image, link) {
		if (!image) {
			this._hide_image();
			return;
		}
		let img_html = `<img src="${image}" style="width:20px; height:20px; border-radius:50%; object-fit:cover;">`;
		if (link) {
			img_html = `<a href="${link}" target="_blank">${img_html}</a>`;
		}
		this.$result_image.html(img_html).show();
	}

	/** Hide image display. */
	_hide_image() {
		this.$result_image.hide().empty();
	}

	/** Setup Awesomplete autocomplete. */
	setup_awesomeplete() {
		const me = this;
		this.$input.cache = {};

		this.awesomplete = new Awesomplete(me.input, {
			tabSelect: true,
			minChars: 0,
			maxItems: 99,
			autoFirst: true,
			list: [],
			replace: () => {},
			data(item) {
				return {
					value: item.id || item.value || item.label,
					label: item.label || item.id || item.value,
				};
			},
			item(item) {
				const d = this.get_item_by_id(item.value);
				let html = `<strong>${frappe.utils.escape_html(d.label)}</strong>`;
				if (d.description && d.description !== d.value) {
					html += `<br><span class="option-description">${frappe.utils.escape_html(d.description)}</span>`;
				}

				return $('<div role="option">')
					.on("click", (event) => {
						me.awesomplete.select(event.currentTarget, event.currentTarget);
					})
					.data("item.autocomplete", d)
					.prop("aria-selected", "false")
					.html(`<p title="${frappe.utils.escape_html(d.label)}">${html}</p>`)[0];
			},
		});

		this._setup_input_listeners();
		this._setup_awesomeplete_listeners();
	}

	/** Setup input listeners for search and selection. */
	_setup_input_listeners() {
		const input_handler = (e) => {
			const term = this._normalize_term(e.target.value);

			if (!term) {
				// No term: clear results and possibly show all if enabled
				this.awesomplete.list = [];
				this._hide_loading();
				this._hide_image();

				if (this.config.show_all_on_empty) {
					this._fetch_data("").then((response) => {
						if (!this.$input.is(":focus")) return;
						this._hide_loading();
						this._render_results(response);
						this._maybe_open_dropdown();
					});
				}
				return;
			}

			// Have a term: fetch filtered options
			this._fetch_data(term).then((response) => {
				if (!this.$input.is(":focus")) return;
				this._hide_loading();
				this._render_results(response);
			});
		};

		const effective_debounce = this.debounce_time && this.debounce_time > 0
			? this.debounce_time
			: (this.config.source === "backend" ? this.config.backend.debounce : 0);

		if (effective_debounce > 0) {
			this.$input.on("input", frappe.utils.debounce(input_handler, effective_debounce));
		} else {
			this.$input.on("input", input_handler);
		}

		this.$input.on("blur", () => {
			if (this.selected) {
				this.selected = false;
				return;
			}

			let value = this.get_input_value();
			let last_value = this.last_value || "";

			if (value !== last_value) {
				this.validate_and_set_in_model(value);
			}
		});
	}

	/** Setup Awesomplete event listeners (open, close, select). */
	_setup_awesomeplete_listeners() {
		this.$input.on("awesomplete-open", () => {
			this.autocomplete_open = true;
		});

		this.$input.on("awesomplete-close", () => {
			this.autocomplete_open = false;
		});

		this.$input.on("awesomplete-select", (e) => {
			const o = e.originalEvent;
			const item = this.awesomplete.get_item_by_id(o.text.value);

			this.autocomplete_open = false;

			if (item && item.id) {
				this._on_select(item);
			}

			if (item && item.image) {
				this._update_image(item.image, item.link);
			}

			this.validate_and_set_in_model(item.label || item.id || item.value);
		});
	}

	/**
	 * Called when an option is selected.
	 * @param {Object} item - The selected item object.
	 */
	_on_select(item) {
		this.on_select_fn(item.id);
	}

	/**
	 * Fetch data from backend or local source.
	 * @param {string} term - The search term.
	 * @param {boolean} exact_match - Whether to enforce exact match search.
	 */
	_fetch_data(term, exact_match = false) {
		if (this.config.source === "backend" && this.config.backend.method) {
			this._show_loading();
			return this._fetch_from_backend(term, exact_match);
		}
		return Promise.resolve(this._filter_local_data(term, exact_match));
	}

	/**
	 * Fetch data from backend using frappe.call.
	 * @param {string} term
	 * @param {boolean} exact_match
	 */
	_fetch_from_backend(term, exact_match = false) {
		const args = { txt: term, exact_match, ...(this.config.backend.args || {}) };
		return frappe.call({
			method: this.config.backend.method,
			args: args,
			no_spinner: true,
		}).then(r => r.message || []);
	}

	/**
	 * Filter local data based on the search term and config.search_fields.
	 * @param {string} term
	 * @param {boolean} exact_match
	 */
	_filter_local_data(term, exact_match = false) {
		let data = this.config.local_data || [];
		term = this._normalize_term(term);

		if (!term && this.config.show_all_on_empty) {
			return { options: data };
		}

		let search_fields = this.config.search_fields;
		let filtered = data.filter(item => {
			if (exact_match) {
				return ((item[search_fields[0]] || "").toLowerCase() === term);
			} else {
				return search_fields.some(field => {
					let val = (item[field] || "").toLowerCase();
					return val.includes(term);
				});
			}
		});

		return { options: filtered };
	}

	/**
	 * Render results in awesomplete and handle image display.
	 * If fallback_to_first_option_image is true, and no image directly from response, fallback to first option's image.
	 * This fallback is only enabled for _on_show_autofetch_image.
	 * @param {Object} response - The response object from backend or local filtering.
	 * @param {Object} opts - Additional options.
	 * @param {boolean} opts.only_image - If true, do not update the list, only update image.
	 * @param {boolean} opts.fallback_to_first_option_image - If true, fallback to first option's image.
	 */
	_render_results(response, { only_image = false, fallback_to_first_option_image = false } = {}) {
		let results = response.options || response;
		if (!only_image) {
			this.awesomplete.list = results;
		}

		let image = response.image;
		let link = response.link;

		if (!image && fallback_to_first_option_image && results && results.length) {
			image = results[0].image;
			link = results[0].link;
		}

		this._update_image(image, link);
	}

	/**
	 * Open dropdown if we have results.
	 */
	_maybe_open_dropdown() {
		if (this.awesomplete.list && this.awesomplete.list.length) {
			this.awesomplete.open();
		}
	}

	/**
	 * Normalize search term to a lowercase, trimmed string.
	 * @param {string} term
	 */
	_normalize_term(term) {
		return String(term || "").toLowerCase().trim();
	}

	/**
	 * Get current input value.
	 * @returns {string|null}
	 */
	get_input_value() {
		return this.$input ? this.$input.val() : null;
	}
};

// Modified Awesomplete method name for clarity
if (Awesomplete) {
	Awesomplete.prototype.get_item_by_id = function(value) {
		return this._list.find(item => item.id === value || item.value === value) || {};
	};
}
