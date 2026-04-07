# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class SweetBranch(models.Model):
    """Sucursal / Branch of Sweet Café.
    Represents a physical store location with its own warehouse and POS sessions.
    """
    _name = 'sweet.branch'
    _description = 'Sucursal Sweet Café'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'sequence, name'

    name = fields.Char(string='Nombre de Sucursal', required=True, tracking=True)
    active = fields.Boolean(default=True)
    code = fields.Char(
        string='Código Corto',
        required=True,
        size=10,
        tracking=True,
        help='Código corto de la sucursal (ej: MAT, NOR, SUR)',
    )
    sequence = fields.Integer(
        string='Secuencia',
        default=10,
    )
    active = fields.Boolean(
        string='Activo',
        default=True,
        tracking=True,
    )
    address = fields.Char(
        string='Dirección',
        tracking=True,
    )
    phone = fields.Char(
        string='Teléfono',
    )
    branch_type = fields.Selection(
        selection=[
            ('main', 'Matriz / Principal'),
            ('secondary', 'Sucursal Secundaria'),
            ('mobile', 'Punto de Venta Móvil'),
            ('online', 'Canal Online'),
        ],
        string='Tipo',
        default='secondary',
        required=True,
        tracking=True,
    )
    company_id = fields.Many2one(
        'res.company',
        string='Compañía',
        required=True,
        default=lambda self: self.env.company,
    )
    warehouse_id = fields.Many2one(
        'stock.warehouse',
        string='Almacén',
        domain="[('company_id', '=', company_id)]",
        tracking=True,
        help='Almacén principal asociado a esta sucursal',
    )
    manager_id = fields.Many2one(
        'hr.employee',
        string='Gerente / Responsable',
        domain="[('company_id', '=', company_id)]",
        tracking=True,
    )
    pos_config_ids = fields.One2many(
        'pos.config',
        'branch_id',
        string='Puntos de Venta',
    )
    pos_config_count = fields.Integer(
        string='# POS',
        compute='_compute_pos_config_count',
    )
    invoice_series = fields.Char(
        string='Serie de Factura',
        help='Prefijo de serie de facturas para esta sucursal (ej: A-, B-, C-)',
    )
    pos_series = fields.Char(
        string='Serie POS',
        help='Prefijo de recibos POS para esta sucursal (ej: POS01-)',
    )
    note = fields.Text(string='Notas')

    _sql_constraints = [
        ('code_company_unique', 'unique(code, company_id)',
         'El código de sucursal debe ser único por compañía.'),
    ]

    @api.depends('pos_config_ids')
    def _compute_pos_config_count(self):
        for branch in self:
            branch.pos_config_count = len(branch.pos_config_ids)

    def action_view_pos_configs(self):
        self.ensure_one()
        return {
            'name': _('Puntos de Venta — %s') % self.name,
            'type': 'ir.actions.act_window',
            'res_model': 'pos.config',
            'view_mode': 'list,form',
            'domain': [('branch_id', '=', self.id)],
            'context': {'default_branch_id': self.id},
        }
