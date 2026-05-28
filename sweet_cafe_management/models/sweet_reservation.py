# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.
from odoo import api, fields, models, _
from odoo.exceptions import ValidationError
from datetime import date, timedelta


class SweetReservation(models.Model):
    """Pedido / reserva anticipada hecha por un cliente (online o en tienda).

    Flujo de estados:
      draft → confirmed → ready → done / cancelled
    """
    _name = 'sweet.reservation'
    _description = 'Reserva de Pedido — Sweet Café'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'delivery_date asc, id desc'
    _rec_name = 'name'

    name = fields.Char(
        string='Referencia', readonly=True, default=lambda self: _('Nueva'),
        copy=False, tracking=True,
    )
    state = fields.Selection([
        ('draft', 'Borrador'),
        ('confirmed', 'Confirmada'),
        ('ready', 'Lista para Entrega'),
        ('done', 'Entregada'),
        ('cancelled', 'Cancelada'),
    ], string='Estado', default='draft', tracking=True, copy=False)

    # Customer
    partner_id = fields.Many2one(
        'res.partner', string='Cliente', required=True, tracking=True,
        index=True,
    )
    partner_phone = fields.Char(related='partner_id.phone', string='Teléfono', readonly=False, store=True)
    partner_email = fields.Char(related='partner_id.email', string='Email', readonly=False, store=True)

    # Branch / delivery
    branch_id = fields.Many2one(
        'sweet.branch', string='Sucursal de Entrega', required=True, tracking=True,
    )
    delivery_date = fields.Date(
        string='Fecha de Entrega', required=True, tracking=True,
        help='Fecha en que el cliente recoge o recibe su pedido',
    )
    delivery_time = fields.Char(
        string='Hora de Entrega', help='Ej: 10:00 – 11:00',
    )

    # Lines
    line_ids = fields.One2many(
        'sweet.reservation.line', 'reservation_id', string='Productos',
    )

    # Financials
    currency_id = fields.Many2one(
        'res.currency', related='company_id.currency_id', readonly=True,
    )
    amount_total = fields.Monetary(
        string='Total Estimado', compute='_compute_amount_total', store=True,
    )
    deposit_amount = fields.Monetary(
        string='Seña / Anticipo',
        help='Monto anticipado pagado por el cliente para confirmar el pedido',
    )
    deposit_paid = fields.Boolean(string='Seña Cobrada', tracking=True)

    # Notes
    customer_notes = fields.Text(string='Indicaciones del Cliente')
    internal_notes = fields.Text(string='Notas Internas')
    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)

    # Origin - whether the request came from website
    origin = fields.Selection([
        ('website', 'Sitio Web'),
        ('phone', 'Teléfono'),
        ('store', 'En Tienda'),
    ], string='Origen', default='store')

    # Linked sale order (created on confirmation)
    sale_order_id = fields.Many2one('sale.order', string='Orden de Venta', readonly=True, copy=False)

    @api.depends('line_ids.subtotal')
    def _compute_amount_total(self):
        for rec in self:
            rec.amount_total = sum(rec.line_ids.mapped('subtotal'))

    @api.constrains('delivery_date')
    def _check_delivery_date(self):
        for rec in self:
            if rec.delivery_date and rec.delivery_date < date.today():
                raise ValidationError(_('La fecha de entrega no puede ser en el pasado.'))

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', _('Nueva')) == _('Nueva'):
                vals['name'] = self.env['ir.sequence'].next_by_code('sweet.reservation') or _('Nueva')
        return super().create(vals_list)

    def action_confirm(self):
        for rec in self:
            if rec.state != 'draft':
                continue
            # ── Validación de integridad antes de confirmar ──────────────
            if not rec.line_ids:
                raise ValidationError(_('No se puede confirmar una reserva sin productos.'))
            if rec.deposit_amount > 0 and not rec.deposit_paid:
                raise ValidationError(
                    _('La seña/anticipo de %(amount)s %(currency)s debe estar cobrada antes de confirmar.',
                      amount=rec.deposit_amount,
                      currency=rec.currency_id.name)
                )
            # ─────────────────────────────────────────────────────────────
            # Create the sale order automatically on confirmation
            if not rec.sale_order_id:
                order_lines = []
                for line in rec.line_ids:
                    # SweetReservationLine.product_id is product.template;
                    # sale.order.line expects product.product (variant).
                    product_variant = line.product_id.product_variant_id
                    if not product_variant:
                        continue
                    order_lines.append((0, 0, {
                        'product_id': product_variant.id,
                        'product_uom_qty': line.qty,
                        'price_unit': line.unit_price,
                        'name': line.notes or line.product_id.name,
                    }))
                order_vals = {
                    'partner_id': rec.partner_id.id,
                    'company_id': rec.company_id.id,
                    'note': rec.customer_notes or '',
                    'order_line': order_lines,
                }
                if rec.branch_id and rec.branch_id.warehouse_id:
                    order_vals['warehouse_id'] = rec.branch_id.warehouse_id.id
                if rec.delivery_date:
                    import datetime as _dt
                    order_vals['commitment_date'] = _dt.datetime.combine(
                        rec.delivery_date, _dt.time(0, 0, 0)
                    )
                order = self.env['sale.order'].create(order_vals)
                order.action_confirm()
                rec.sale_order_id = order
                rec.message_post(
                    body=_('Reserva confirmada. Orden de venta <b>%s</b> creada automáticamente.')
                    % order.name
                )
            else:
                rec.message_post(body=_('Reserva confirmada.'))
            rec.state = 'confirmed'

    def action_ready(self):
        for rec in self:
            rec.state = 'ready'
            rec.message_post(body=_('Pedido listo para entrega.'))

    def action_done(self):
        for rec in self:
            rec.state = 'done'
            rec.message_post(body=_('Pedido entregado al cliente.'))

    def action_cancel(self):
        for rec in self:
            rec.state = 'cancelled'
            rec.message_post(body=_('Reserva cancelada.'))

    def action_draft(self):
        for rec in self:
            rec.state = 'draft'

    def action_create_sale_order(self):
        """Crea una orden de venta en Odoo a partir de esta reserva."""
        self.ensure_one()
        if self.sale_order_id:
            return {
                'type': 'ir.actions.act_window',
                'res_model': 'sale.order',
                'res_id': self.sale_order_id.id,
                'view_mode': 'form',
            }
        order_lines = []
        for line in self.line_ids:
            order_lines.append((0, 0, {
                'product_id': line.product_id.id,
                'product_uom_qty': line.qty,
                'price_unit': line.unit_price,
                'name': line.notes or line.product_id.name,
            }))
        order = self.env['sale.order'].create({
            'partner_id': self.partner_id.id,
            'company_id': self.company_id.id,
            'note': self.customer_notes or '',
            'order_line': order_lines,
            'commitment_date': fields.Datetime.now().replace(
                year=self.delivery_date.year,
                month=self.delivery_date.month,
                day=self.delivery_date.day,
            ) if self.delivery_date else False,
        })
        self.sale_order_id = order
        self.message_post(body=_('Orden de venta %s creada.') % order.name)
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'sale.order',
            'res_id': order.id,
            'view_mode': 'form',
        }


class SweetReservationLine(models.Model):
    """Línea de producto de una reserva."""
    _name = 'sweet.reservation.line'
    _description = 'Línea de Reserva'

    reservation_id = fields.Many2one('sweet.reservation', ondelete='cascade')
    product_id = fields.Many2one(
        'product.template', string='Producto', required=True,
        domain=[('sale_ok', '=', True)],
    )
    qty = fields.Float(string='Cantidad', default=1.0)
    unit_price = fields.Monetary(string='Precio Unitario', currency_field='currency_id')
    currency_id = fields.Many2one(
        'res.currency', related='reservation_id.currency_id',
    )
    subtotal = fields.Monetary(
        string='Subtotal', compute='_compute_subtotal', store=True,
    )
    notes = fields.Char(string='Personalización / Notas')
    flavor = fields.Char(string='Sabor / Variante')

    @api.depends('qty', 'unit_price')
    def _compute_subtotal(self):
        for line in self:
            line.subtotal = line.qty * line.unit_price

    @api.onchange('product_id')
    def _onchange_product(self):
        if self.product_id:
            self.unit_price = self.product_id.list_price
