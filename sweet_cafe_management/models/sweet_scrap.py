# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class SweetScrap(models.Model):
    """Control de Mermas — Sweet Café.

    Tracks product losses (damaged goods, expired items, production waste, theft).
    Uses a supervisor approval workflow before the actual stock.scrap is created in Odoo.
    """
    _name = 'sweet.scrap'
    _description = 'Control de Merma'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'date desc, name desc'

    name = fields.Char(
        string='Referencia',
        readonly=True,
        copy=False,
        default='/',
        tracking=True,
    )
    date = fields.Datetime(
        string='Fecha',
        default=fields.Datetime.now,
        required=True,
        tracking=True,
    )
    state = fields.Selection(
        selection=[
            ('draft', 'Borrador'),
            ('pending', 'Pendiente Aprobación'),
            ('approved', 'Aprobado'),
            ('rejected', 'Rechazado'),
        ],
        string='Estado',
        default='draft',
        required=True,
        tracking=True,
        copy=False,
    )
    production_loss_type = fields.Selection(
        selection=[
            ('tecnica', 'Merma Técnica'),
            ('negligencia', 'Negligencia'),
            ('caducidad', 'Caducidad'),
            ('rotura', 'Rotura / Daño'),
            ('robo', 'Robo / Pérdida'),
        ],
        string='Tipo de Merma',
        required=True,
        tracking=True,
    )
    reason_id = fields.Many2one(
        'sweet.scrap.reason',
        string='Motivo Específico',
        tracking=True,
    )
    product_id = fields.Many2one(
        'product.product',
        string='Producto',
        required=True,
        domain="[('type', 'in', ['consu', 'product'])]",
        tracking=True,
    )
    product_uom_id = fields.Many2one(
        'uom.uom',
        string='Unidad de Medida',
        required=True,
        compute='_compute_product_uom_id',
        store=True,
        readonly=False,
    )
    lot_id = fields.Many2one(
        'stock.lot',
        string='Lote / Serie',
        domain="[('product_id', '=', product_id)]",
        tracking=True,
    )
    qty = fields.Float(
        string='Cantidad',
        required=True,
        default=1.0,
        digits='Product Unit of Measure',
        tracking=True,
    )
    location_id = fields.Many2one(
        'stock.location',
        string='Ubicación de Origen',
        required=True,
        domain="[('usage', '=', 'internal')]",
        tracking=True,
    )
    scrap_location_id = fields.Many2one(
        'stock.location',
        string='Ubicación de Destino (Merma)',
        domain="[('usage', '=', 'inventory')]",
        tracking=True,
    )
    responsible_id = fields.Many2one(
        'hr.employee',
        string='Responsable',
        default=lambda self: self.env.user.employee_id,
        tracking=True,
    )
    supervisor_id = fields.Many2one(
        'hr.employee',
        string='Supervisor / Aprobador',
        tracking=True,
    )
    branch_id = fields.Many2one(
        'sweet.branch',
        string='Sucursal',
        tracking=True,
    )
    company_id = fields.Many2one(
        'res.company',
        string='Compañía',
        required=True,
        default=lambda self: self.env.company,
    )
    image = fields.Binary(
        string='Foto / Evidencia',
        attachment=True,
    )
    note = fields.Text(string='Observaciones')
    odoo_scrap_id = fields.Many2one(
        'stock.scrap',
        string='Ajuste de Stock',
        readonly=True,
        copy=False,
        help='Referencia al registro stock.scrap creado al aprobar esta merma.',
    )
    rejection_reason = fields.Text(
        string='Motivo de Rechazo',
        readonly=True,
        copy=False,
    )

    @api.depends('product_id')
    def _compute_product_uom_id(self):
        for scrap in self:
            scrap.product_uom_id = scrap.product_id.uom_id

    @api.onchange('branch_id')
    def _onchange_branch_id(self):
        """Pre-fill the stock location from the branch's warehouse when branch changes."""
        for scrap in self:
            if scrap.branch_id and scrap.branch_id.warehouse_id:
                warehouse = scrap.branch_id.warehouse_id
                if warehouse.lot_stock_id:
                    scrap.location_id = warehouse.lot_stock_id

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', '/') == '/':
                vals['name'] = self.env['ir.sequence'].next_by_code('sweet.scrap') or '/'
        return super().create(vals_list)

    def action_submit(self):
        """Submit for supervisor approval."""
        for scrap in self:
            if scrap.state != 'draft':
                raise UserError(_('Solo se puede enviar mermas en estado Borrador.'))
            if scrap.qty <= 0:
                raise ValidationError(_('La cantidad de merma debe ser mayor a cero.'))
            scrap.state = 'pending'

    def action_approve(self):
        """Approve merma: create corresponding stock.scrap in Odoo."""
        for scrap in self:
            if scrap.state != 'pending':
                raise UserError(_('Solo se puede aprobar mermas en estado Pendiente de Aprobación.'))
            odoo_scrap = self.env['stock.scrap'].create({
                'product_id': scrap.product_id.id,
                'product_uom_id': scrap.product_uom_id.id,
                'lot_id': scrap.lot_id.id if scrap.lot_id else False,
                'scrap_qty': scrap.qty,
                'location_id': scrap.location_id.id,
                'scrap_location_id': scrap.scrap_location_id.id if scrap.scrap_location_id else False,
                'company_id': scrap.company_id.id,
                'origin': scrap.name,
            })
            odoo_scrap.action_validate()
            scrap.write({
                'state': 'approved',
                'odoo_scrap_id': odoo_scrap.id,
                'supervisor_id': self.env.user.employee_id.id or scrap.supervisor_id.id,
            })

    def action_reject(self):
        """Return wizard to collect rejection reason."""
        self.ensure_one()
        return {
            'name': _('Rechazar Merma'),
            'type': 'ir.actions.act_window',
            'res_model': 'sweet.scrap.approve.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_scrap_id': self.id,
                'default_action': 'reject',
            },
        }

    def action_reset_draft(self):
        """Reset to draft (only if rejected)."""
        for scrap in self:
            if scrap.state not in ('rejected',):
                raise UserError(_('Solo se pueden resetear mermas rechazadas.'))
            scrap.write({'state': 'draft', 'rejection_reason': False})

    def action_view_stock_scrap(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'res_model': 'stock.scrap',
            'view_mode': 'form',
            'res_id': self.odoo_scrap_id.id,
            'target': 'current',
        }
