# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class HrSalaryScale(models.Model):
    """Cuban salary scale model (Escalas Salariales Cubanas).

    Cuba uses an occupational scale system (1–18) where each position
    corresponds to a fixed basic salary in CUP (Cuban Pesos).
    This model stores the official scale table and is referenced from
    hr.employee for payroll calculation.
    """
    _name = 'hr.salary.scale'
    _description = 'Escala Salarial Cubana'
    _order = 'scale_number'

    name = fields.Char(
        string='Denominación',
        required=True,
        translate=True,
        help='Nombre descriptivo de la escala (ej: Escala 8 — Técnico Medio)',
    )
    scale_number = fields.Integer(
        string='Número de Escala',
        required=True,
        help='Número de escala del 1 al 18 según la nomenclatura cubana',
    )
    basic_salary = fields.Monetary(
        string='Salario Básico (CUP)',
        required=True,
        currency_field='currency_id',
        help='Salario básico mensual en pesos cubanos (CUP)',
    )
    currency_id = fields.Many2one(
        'res.currency',
        string='Moneda',
        default=lambda self: self.env['res.currency'].search([('name', '=', 'CUP')], limit=1)
                             or self.env.company.currency_id,
        required=True,
    )
    category = fields.Selection(
        selection=[
            ('operario', 'Operario'),
            ('tecnico', 'Técnico'),
            ('administrativo', 'Administrativo'),
            ('cuadro', 'Cuadro / Directivo'),
            ('servicio', 'Servicios'),
        ],
        string='Categoría Ocupacional',
        required=True,
        default='operario',
    )
    complexity_level = fields.Selection(
        selection=[
            ('low', 'Baja Complejidad'),
            ('medium', 'Complejidad Media'),
            ('high', 'Alta Complejidad'),
        ],
        string='Nivel de Complejidad',
        default='low',
    )
    active = fields.Boolean(
        string='Activo',
        default=True,
    )
    note = fields.Text(string='Descripción / Funciones')

    _sql_constraints = [
        ('scale_number_unique', 'unique(scale_number)',
         'El número de escala salarial debe ser único.'),
        ('scale_number_range', 'CHECK(scale_number >= 1 AND scale_number <= 18)',
         'El número de escala debe estar entre 1 y 18.'),
    ]

    @api.constrains('basic_salary')
    def _check_basic_salary(self):
        for scale in self:
            if scale.basic_salary <= 0:
                raise ValidationError(
                    _('El salario básico de la Escala %s debe ser mayor que cero.') % scale.scale_number
                )
