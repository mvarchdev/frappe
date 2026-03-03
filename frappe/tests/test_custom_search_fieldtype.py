# Copyright (c) 2026, Sunray and contributors
# License: MIT. See LICENSE

from frappe.custom.doctype.customize_form.customize_form import CustomizeForm
from frappe.database.mariadb.database import MariaDBDatabase
from frappe.database.postgres.database import PostgresDatabase
from frappe.model import data_fieldtypes
from frappe.model.docfield import supports_translation
from frappe.tests import IntegrationTestCase


class TestCustomSearchFieldtype(IntegrationTestCase):
	def _build_db_with_type_map(self, db_cls):
		db = db_cls.__new__(db_cls)
		db.VARCHAR_LEN = 140
		db.setup_type_map()
		return db

	def test_custom_search_is_data_fieldtype(self):
		self.assertIn("Custom Search", data_fieldtypes)

	def test_custom_search_supports_translation(self):
		self.assertTrue(supports_translation("Custom Search"))

	def test_customize_form_allows_data_to_custom_search_change(self):
		self.assertTrue(CustomizeForm.allow_fieldtype_change("Data", "Custom Search"))

	def test_mariadb_type_map_contains_custom_search(self):
		db = self._build_db_with_type_map(MariaDBDatabase)
		self.assertEqual(db.type_map.get("Custom Search"), ("varchar", db.VARCHAR_LEN))

	def test_postgres_type_map_contains_custom_search(self):
		db = self._build_db_with_type_map(PostgresDatabase)
		self.assertEqual(db.type_map.get("Custom Search"), ("varchar", db.VARCHAR_LEN))
