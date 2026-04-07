# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class HrEmployee(models.Model):
    """Extension of hr.employee for Cuban labor law requirements.

    Adds fields required by Cuban legislation:
    - Carnet de Identidad (CI) — unique national ID
    - Address details (municipio, provincia)
    - Education level (escolaridad)
    - Number of dependants (hijos) — affects payroll
    - Salary scale (escala salarial 1-18)
    - Occupational category (operario, técnico, administrativo, cuadro)
    - Payment form (escala fija, destajo, mixto)
    """
    _inherit = 'hr.employee'

    # ─── Cuban personal data ────────────────────────────────────────────────
    carnet_identidad = fields.Char(
        string='Carnet de Identidad (CI)',
        size=11,
        groups='hr.group_hr_user',
        tracking=True,
        help='Número de carnet de identidad cubano (11 dígitos)',
    )
    municipio = fields.Char(
        string='Municipio',
        groups='hr.group_hr_user',
        tracking=True,
    )
    provincia = fields.Char(
        string='Provincia',
        groups='hr.group_hr_user',
        tracking=True,
    )
    escolaridad = fields.Selection(
        selection=[
            ('primaria', 'Primaria'),
            ('9no', '9no Grado'),
            ('12mo', '12mo Grado / Preuniversitario'),
            ('tecnico', 'Técnico Medio'),
            ('universitario', 'Universitario'),
            ('postgrado', 'Postgrado / Máster / Doctor'),
        ],
        string='Escolaridad',
        groups='hr.group_hr_user',
        tracking=True,
    )
    num_hijos = fields.Integer(
        string='Número de Hijos (menores)',
        default=0,
        groups='hr.group_hr_user',
        tracking=True,
        help='Hijos menores de 18 años. Genera plus de 40 CUP por hijo en nómina.',
    )
    estado_civil = fields.Selection(
        selection=[
            ('soltero', 'Soltero/a'),
            ('casado', 'Casado/a'),
            ('divorciado', 'Divorciado/a'),
            ('viudo', 'Viudo/a'),
            ('union_consensual', 'Unión Consensual'),
        ],
        string='Estado Civil',
        groups='hr.group_hr_user',
        tracking=True,
    )

    # ─── Labor data (Cuba) ──────────────────────────────────────────────────
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
    categoria_ocupacional = fields.Selection(
        selection=[
            ('operario', 'Operario'),
            ('tecnico', 'Técnico'),
            ('administrativo', 'Administrativo'),
            ('cuadro', 'Cuadro / Directivo'),
            ('servicio', 'Servicios'),
        ],
        string='Categoría Ocupacional',
        groups='hr.group_hr_user',
        tracking=True,
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

    # ─── SQL constraints ────────────────────────────────────────────────────
    _sql_constraints = [
        ('carnet_identidad_unique', 'unique(carnet_identidad)',
         'El Carnet de Identidad debe ser único por empleado.'),
    ]

    # ─── Compute / onchange ─────────────────────────────────────────────────
    @api.constrains('carnet_identidad')
    def _check_carnet_identidad(self):
        for emp in self:
            if emp.carnet_identidad and (
                not emp.carnet_identidad.isdigit() or len(emp.carnet_identidad) != 11
            ):
                raise ValidationError(
                    _('El Carnet de Identidad debe contener exactamente 11 dígitos numéricos.')
                )

    @api.onchange('salary_scale_id')
    def _onchange_salary_scale_id(self):
        """Auto-set occupational category from salary scale."""
        if self.salary_scale_id:
            self.categoria_ocupacional = self.salary_scale_id.category
