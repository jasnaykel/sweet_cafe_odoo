# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import api, models
from odoo.fields import Command


class ProductDocument(models.Model):
    _inherit = 'product.document'

    @api.depends('datas', 'attached_on_sale')
    def _compute_form_field_ids(self):
        # Override to filter out ghost records caused by savepoint rollbacks
        # during bulk demo/data loading (stale ORM compute todos after ROLLBACK
        # TO SAVEPOINT produce FK violations on the join table).
        self.form_field_ids = [Command.clear()]
        document_to_parse = self.filtered(
            lambda doc: doc.attached_on_sale == 'inside'
            and doc.datas
            and doc.mimetype
            and doc.mimetype.endswith('pdf')
        )
        if document_to_parse:
            document_to_parse = document_to_parse.exists()
        if document_to_parse:
            self.env['sale.pdf.form.field']._create_or_update_form_fields_on_pdf_records(
                document_to_parse, 'product_document'
            )
