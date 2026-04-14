# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class HrEmployee(models.Model):
    """Sweet Café extension of hr.employee.

    Cuban personal/labor fields provided by l10n_cu_hr and
    l10n_cu_hr_employee_contract (identification_id, schooling_level_id,
    occupational_category_id, res_private_municipality_id, etc.).

    This class adds only what is exclusive to Sweet Café:
    - num_hijos           — dependants, drives plus por hijos in payroll
    - salary_scale_id     — Cuban salary scale 1-18 (Sweet's own table)
    - forma_pago          — payment form (scale / piece-rate / mixed)
    - horario_trabajo     — shift type
    - branch_id           — Sweet Café branch assignment
    """
    _inherit = 'hr.employee'

    # ─── Sweet-exclusive payroll data ───────────────────────────────────────
    num_hijos = fields.Integer(
        string='Número de Hijos (menores)',
        default=0,
        groups='hr.group_hr_user',
        tracking=True,
        help='Hijos menores de 18 años. Genera plus de 40 CUP por hijo en nómina.',
    )
    salary_scale_id = fields.Many2one(
        'hr.salary.scale',
        string='Escala Salarial',
        groups='hr.group_hr_user',
        tracking=True,
        help='Escala salarial cubana asignada (1-18)',
    )
    basic_salary_cup = fields.Monetary(
        string='Salario Básico CUP',
        related='salary_scale_id.basic_salary',
        currency_field='cup_currency_id',
        groups='hr.group_hr_user',
        readonly=True,
        store=False,
    )
    cup_currency_id = fields.Many2one(
        'res.currency',
        string='Moneda CUP',
        related='salary_scale_id.currency_id',
        groups='hr.group_hr_user',
    )
    forma_pago = fields.Selection(
        selection=[
            ('escala', 'Por Escala (fija)'),
            ('destajo', 'Por Destajo (producción)'),
            ('mixto', 'Mixto'),
        ],
        string='Forma de Pago',
        default='escala',
        groups='hr.group_hr_user',
        tracking=True,
    )
    horario_trabajo = fields.Selection(
        selection=[
            ('continuo', 'Continuo (8am–5pm)'),
            ('turno', 'Por Turnos (rotativo)'),
            ('parcial', 'Tiempo Parcial'),
        ],
        string='Tipo de Horario',
        default='continuo',
        groups='hr.group_hr_user',
        tracking=True,
    )

    # ─── Branch / Sucursal ──────────────────────────────────────────────────
    branch_id = fields.Many2one(
        'sweet.branch',
        string='Sucursal',
        groups='hr.group_hr_user',
        tracking=True,
        help='Sucursal donde labora principalmente el trabajador',
    )

    # ─── Onchange ───────────────────────────────────────────────────────────
    @api.onchange('salary_scale_id')
    def _onchange_salary_scale_id(self):
        """Sync occupational_category_id from salary scale category."""
        if self.salary_scale_id:
            category_map = {
                'operario': self.env['occupational.category'].search(
                    [('name', 'ilike', 'Operario')], limit=1),
                'tecnico': self.env['occupational.category'].search(
                    [('name', 'ilike', 'Técnico')], limit=1),
                'administrativo': self.env['occupational.category'].search(
                    [('name', 'ilike', 'Administrativo')], limit=1),
                'cuadro': self.env['occupational.category'].search(
                    [('name', 'ilike', 'Cuadro')], limit=1),
                'servicio': self.env['occupational.category'].search(
                    [('name', 'ilike', 'Servicio')], limit=1),
            }
            cat = category_map.get(self.salary_scale_id.category)
            if cat:
                self.occupational_category_id = cat
