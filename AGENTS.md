- Pricelist data lives in `pricelist_items` (one row per item, `category` column); bulk updates go through the admin-only `replace_pricelist` RPC so an Excel import replaces a category atomically.

- Oil pricelist uses dedicated item_code, item_name and unit columns with category-aware parsing, search and views; this preserves the Excel meaning without overloading tire fields.

- Pricelist item names and inline vehicle details use `PricelistItemName` with ResizeObserver-based overflow detection; this keeps the conditional detail control accurate when the available width changes.
