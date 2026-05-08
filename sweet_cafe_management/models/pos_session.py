# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

import calendar
from odoo import api, fields, models, _


class PosSession(models.Model):
    """Extends pos.session to feed closed POS sessions into sweet.libro.igi."""
    _inherit = 'pos.session'

    def _create_libro_igi_entry(self):
        """Creates a sweet.libro.igi.line for the total income of this POS session.

        Called automatically when the session is closed.
        Only creates an entry if the linked pos.config has a branch_id configured.
        Avoids duplicates: checks if a line for this session already exists.
        """
        self.ensure_one()
        branch = self.config_id.branch_id
        if not branch:
            return  # No branch configured — nothing to do

        # Total income of this session (payments received)
        total_income = self.total_payments_amount or 0.0
        if total_income <= 0.0:
            return

        # Determine the month/year from the session's stop_at date
        session_date = self.stop_at.date() if self.stop_at else fields.Date.today()
        year = session_date.year
        month = str(session_date.month)
        company = self.company_id

        # Find or create the Libro IGI for this branch/month/year
        libro = self.env['sweet.libro.igi'].search([
            ('year', '=', year),
            ('month', '=', month),
            ('company_id', '=', company.id),
            ('branch_id', '=', branch.id),
        ], limit=1)

        if not libro:
            libro = self.env['sweet.libro.igi'].create({
                'year': year,
                'month': month,
                'company_id': company.id,
                'branch_id': branch.id,
            })

        # Skip if entry for this session already exists to avoid duplicates
        existing = self.env['sweet.libro.igi.line'].search([
            ('libro_id', '=', libro.id),
            ('document_ref', '=', self.name),
            ('document_type', '=', 'ticket_pos'),
        ], limit=1)
        if existing:
            return

        self.env['sweet.libro.igi.line'].create({
            'libro_id': libro.id,
            'date': session_date,
            'description': _('Cierre POS — %s') % self.name,
            'move_type': 'income',
            'payment_method': 'cash',
            'document_type': 'ticket_pos',
            'document_ref': self.name,
            'amount': total_income,
        })

    def action_pos_session_closing_control(self, balancing_account=False, amount_to_balance=0, bank_payment_method_diffs=None):
        """Override closing control to also populate the Libro IGI."""
        result = super().action_pos_session_closing_control(
            balancing_account=balancing_account,
            amount_to_balance=amount_to_balance,
            bank_payment_method_diffs=bank_payment_method_diffs,
        )
        # Create Libro IGI entry after the session is properly closed
        try:
            self._create_libro_igi_entry()
        except Exception:
            # Never block POS closing due to an IGI error — just log
            _logger_name = 'odoo.addons.sweet_cafe_management.models.pos_session'
            import logging
            logging.getLogger(_logger_name).exception(
                'Could not create Libro IGI entry for POS session %s', self.name
            )
        return result
