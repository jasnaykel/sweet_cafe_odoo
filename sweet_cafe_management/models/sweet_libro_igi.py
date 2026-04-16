# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.
"""
Libro de Ingresos y Gastos — ONAT Cuba.

Registra diariamente los ingresos y gastos del negocio en el formato
simplificado exigido por la ONAT para TCP y MIPYME, incluyendo:
  - Fecha, descripción, tipo (ingreso / gasto)
  - Método de cobro/pago: efectivo, transferencia, QR/MLC
  - Tipo de comprobante: factura, SC-09, aduana, ticket POS, etc.
  - Referencia cruzada con facturas/asientos de Odoo
  - Trazabilidad por sucursal

Respaldo normativo: Ley 113 del Sistema Tributario, Decreto 308/2012.
"""

import calendar

from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class SweetLibroIGI(models.Model):
    """Libro mensual de Ingresos y Gastos para la ONAT."""

    _name = 'sweet.libro.igi'
    _description = 'Libro de Ingresos y Gastos — ONAT Cuba'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'year desc, month desc'
    _rec_name = 'display_name'

    # ── Período ────────────────────────────────────
    year = fields.Integer(
        string='Año',
        required=True,
        default=lambda self: fields.Date.today().year,
    )
    month = fields.Selection([
        ('1', 'Enero'), ('2', 'Febrero'), ('3', 'Marzo'), ('4', 'Abril'),
        ('5', 'Mayo'), ('6', 'Junio'), ('7', 'Julio'), ('8', 'Agosto'),
        ('9', 'Septiembre'), ('10', 'Octubre'), ('11', 'Noviembre'), ('12', 'Diciembre'),
    ], string='Mes', required=True,
        default=lambda self: str(fields.Date.today().month),
    )
    display_name = fields.Char(compute='_compute_display_name', store=True)
    state = fields.Selection([
        ('open', 'Abierto'),
        ('closed', 'Cerrado'),
    ], string='Estado', default='open', tracking=True, copy=False)

    company_id = fields.Many2one(
        'res.company', string='Empresa',
        default=lambda self: self.env.company, required=True,
    )
    branch_id = fields.Many2one(
        'sweet.branch', string='Sucursal',
        domain="[('company_id', '=', company_id)]",
    )
    currency_id = fields.Many2one(
        'res.currency', related='company_id.currency_id', readonly=True,
    )

    # ── Líneas ─────────────────────────────────────
    line_ids = fields.One2many(
        'sweet.libro.igi.line', 'libro_id', string='Movimientos',
    )

    # ── Totales ────────────────────────────────────
    total_income = fields.Monetary(
        string='Total Ingresos', compute='_compute_totals', store=True,
    )
    total_expense = fields.Monetary(
        string='Total Gastos', compute='_compute_totals', store=True,
    )
    balance = fields.Monetary(
        string='Balance (Ingresos − Gastos)', compute='_compute_totals', store=True,
    )
    notes = fields.Text(string='Observaciones')

    # ── Sub-totales por método de pago ─────────────
    total_cash = fields.Monetary(
        string='Ingresos Efectivo', compute='_compute_totals', store=True,
    )
    total_transfer = fields.Monetary(
        string='Ingresos Transferencia', compute='_compute_totals', store=True,
    )
    total_qr = fields.Monetary(
        string='Ingresos QR/MLC', compute='_compute_totals', store=True,
    )

    @api.depends('year', 'month')
    def _compute_display_name(self):
        months = dict(self._fields['month'].selection)
        for rec in self:
            rec.display_name = 'LIG %s/%s' % (months.get(rec.month, rec.month), rec.year)

    @api.depends('line_ids.move_type', 'line_ids.amount', 'line_ids.payment_method')
    def _compute_totals(self):
        for rec in self:
            income_lines = rec.line_ids.filtered(lambda l: l.move_type == 'income')
            expense_lines = rec.line_ids.filtered(lambda l: l.move_type == 'expense')
            rec.total_income = sum(income_lines.mapped('amount'))
            rec.total_expense = sum(expense_lines.mapped('amount'))
            rec.balance = rec.total_income - rec.total_expense
            rec.total_cash = sum(l.amount for l in income_lines if l.payment_method == 'cash')
            rec.total_transfer = sum(l.amount for l in income_lines if l.payment_method == 'transfer')
            rec.total_qr = sum(l.amount for l in income_lines if l.payment_method == 'qr')

    @api.constrains('year', 'month', 'company_id', 'branch_id')
    def _check_unique(self):
        for rec in self:
            domain = [
                ('year', '=', rec.year),
                ('month', '=', rec.month),
                ('company_id', '=', rec.company_id.id),
                ('branch_id', '=', rec.branch_id.id if rec.branch_id else False),
                ('id', '!=', rec.id),
            ]
            if self.search(domain):
                raise ValidationError(_(
                    'Ya existe un Libro IGI para %s/%s en esta empresa/sucursal.'
                ) % (rec.month, rec.year))

    def write(self, vals):
        closed = self.filtered(lambda r: r.state == 'closed')
        if closed and 'state' not in vals:
            raise UserError(_(
                'No puede modificar un Libro IGI cerrado. '
                'Réabralo primero si necesita hacer correcciones.'
            ))
        return super().write(vals)

    def unlink(self):
        if any(r.state == 'closed' for r in self):
            raise UserError(_('No puede eliminar un Libro IGI cerrado.'))
        return super().unlink()

    def action_close(self):
        """Cierra el libro del período para auditoría."""
        for rec in self:
            rec.state = 'closed'
            rec.message_post(body=_('Libro cerrado. Listo para inspección de la ONAT.'))

    def action_reopen(self):
        """Reabre el libro para correcciones (requiere permiso de administrador)."""
        self.state = 'open'
        self.message_post(body=_('Libro reabierto para correcciones.'))

    def action_populate_from_accounting(self):
        """Importa movimientos desde facturas de Odoo sin duplicar."""
        self.ensure_one()
        from_date = '%d-%02d-01' % (self.year, int(self.month))
        last_day = calendar.monthrange(self.year, int(self.month))[1]
        to_date = '%d-%02d-%02d' % (self.year, int(self.month), last_day)

        existing_move_ids = (
            self.line_ids.filtered('account_move_id').mapped('account_move_id').ids
        )
        moves = self.env['account.move'].search([
            ('move_type', 'in', ('out_invoice', 'out_refund', 'in_invoice', 'in_refund')),
            ('state', '=', 'posted'),
            ('invoice_date', '>=', from_date),
            ('invoice_date', '<=', to_date),
            ('company_id', '=', self.company_id.id),
            ('id', 'not in', existing_move_ids),
        ])

        lines_to_create = []
        for move in moves:
            is_income = move.move_type in ('out_invoice', 'out_refund')
            sign = 1 if move.move_type in ('out_invoice', 'in_invoice') else -1
            amount = move.amount_untaxed * sign
            if amount == 0:
                continue
            lines_to_create.append({
                'libro_id': self.id,
                'date': move.invoice_date,
                'description': move.name or move.ref or _('Factura'),
                'move_type': 'income' if is_income else 'expense',
                'amount': abs(amount),
                'document_type': 'factura',
                'document_ref': move.name,
                'account_move_id': move.id,
                'payment_method': 'transfer',
            })

        if lines_to_create:
            self.env['sweet.libro.igi.line'].create(lines_to_create)
        count = len(lines_to_create)
        self.message_post(body=_('%d líneas importadas desde contabilidad.') % count)
        return {
            'type': 'ir.actions.client',
            'tag': 'display_notification',
            'params': {
                'title': _('Importación completada'),
                'message': _('%d movimientos importados correctamente.') % count,
                'type': 'success',
                'sticky': False,
            },
        }


class SweetLibroIGILine(models.Model):
    """Línea diaria del Libro de Ingresos y Gastos."""

    _name = 'sweet.libro.igi.line'
    _description = 'Línea — Libro IGI ONAT Cuba'
    _order = 'date, id'

    libro_id = fields.Many2one(
        'sweet.libro.igi', string='Libro', required=True, ondelete='cascade',
    )
    date = fields.Date(
        string='Fecha', required=True, default=fields.Date.today,
    )
    description = fields.Char(
        string='Descripción del Movimiento', required=True,
    )
    move_type = fields.Selection([
        ('income', 'Ingreso'),
        ('expense', 'Gasto'),
    ], string='Tipo', required=True, default='income')
    payment_method = fields.Selection([
        ('cash', 'Efectivo (CUP)'),
        ('transfer', 'Transferencia Bancaria'),
        ('qr', 'QR / MLC / Divisas'),
        ('other', 'Otro'),
    ], string='Método de Cobro/Pago', required=True, default='cash')
    document_type = fields.Selection([
        ('factura', 'Factura'),
        ('comprobante', 'Comprobante de Compra'),
        ('modelo_sc09', 'Modelo SC-09 (ONAT)'),
        ('aduana', 'Declaración Aduanal / Importación'),
        ('ticket_pos', 'Ticket POS'),
        ('otro', 'Otro'),
    ], string='Tipo de Comprobante', required=True, default='factura')
    document_ref = fields.Char(
        string='Número de Comprobante / Referencia',
        help='Número de factura, recibo, DUA u otro documento de soporte.',
    )
    amount = fields.Monetary(
        string='Importe (CUP)', required=True, currency_field='currency_id',
    )
    currency_id = fields.Many2one(
        'res.currency', related='libro_id.currency_id', readonly=True,
    )
    branch_id = fields.Many2one(
        'sweet.branch', string='Sucursal',
        related='libro_id.branch_id', store=True, readonly=False,
    )
    account_move_id = fields.Many2one(
        'account.move', string='Factura / Asiento Relacionado',
        help='Documento de Odoo que originó este movimiento.',
    )
    notes = fields.Char(string='Observaciones')

    @api.constrains('amount')
    def _check_amount_positive(self):
        for line in self:
            if line.amount <= 0:
                raise ValidationError(_('El importe debe ser mayor que cero.'))
