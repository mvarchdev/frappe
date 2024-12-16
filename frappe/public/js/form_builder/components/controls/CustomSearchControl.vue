<!-- Used as Custom Search Control -->
<script setup>
import { onMounted, ref, useSlots, computed, watch } from "vue";

const props = defineProps(["args", "df", "read_only", "modelValue"]);
let emit = defineEmits(["update:modelValue"]);
let slots = useSlots();

let custom_search_ref = ref(null);
let update_control = ref(true);

let content = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
});

let custom_search_control = computed(() => {
	if (!custom_search_ref.value) return;
	custom_search_ref.value.innerHTML = "";

	return frappe.ui.form.make_control({
		parent: custom_search_ref.value,
		df: {
			...props.df,
			fieldtype: "Custom Search", // ensure correct fieldtype if needed
			hidden: 0,
			read_only: Boolean(slots.label) || props.read_only,
			change: () => {
				if (update_control.value) {
					content.value = custom_search_control.value.get_value();
				}
				update_control.value = true;
			},
		},
		value: content.value,
		render_input: true,
		only_input: Boolean(slots.label),
		control_class: "ControlCustomSearch", // This ensures frappe uses ControlCustomSearch
	});
});

onMounted(() => {
	if (custom_search_ref.value) {
		// Similar logic to LinkControl to set filters if it's a table field
		if (props.args?.is_table_field) {
			if (props.df.filters) {
				props.df.filters.istable = 1;
			} else {
				props.df.filters = { istable: 1 };
			}
		} else {
			if (props.df.filters && "istable" in props.df.filters) {
				delete props.df.filters.istable;
			}
		}

		custom_search_control.value;
	}
});

watch(
	() => content.value,
	(value) => {
		update_control.value = false;
		custom_search_control.value?.set_value(value);
	}
);
</script>

<template>
	<div
		v-if="slots.label"
		class="control frappe-control"
		:data-fieldtype="df.fieldtype"
		:class="{ editable: slots.label }"
	>
		<!-- label -->
		<div class="field-controls">
			<slot name="label" />
			<slot name="actions" />
		</div>

		<!-- This read-only input is shown if there's a label -->
		<input class="form-control" type="text" readonly />

		<!-- description -->
		<div v-if="df.description" class="mt-2 description" v-html="df.description" />
	</div>
	<!-- If no label slot, we render the actual Custom Search control -->
	<div v-else ref="custom_search_ref"></div>
</template>
