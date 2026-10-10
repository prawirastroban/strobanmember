- Pricelist data lives in `pricelist_items` (one row per item, `category` column); bulk updates go through the admin-only `replace_pricelist` RPC so an Excel import replaces a category atomically.

- Oil pricelist uses dedicated item_code, item_name and unit columns with category-aware parsing, search and views; this preserves the Excel meaning without overloading tire fields.
