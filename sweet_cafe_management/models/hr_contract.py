# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from dateutil.relativedelta import relativedelta
from odoo import api, fields, models


class HrVersion(models.Model):
    """Extends hr.version (Odoo 19 contract model) with Cuban payroll fields.

    In Odoo 19, hr.version stores contract/employment terms per period.
    We add Cuba-specific compensation components:
    - Plus por Antigüedad (seniority bonus): 1% of basic salary per year, max 20%
    - Plus por Hijos: 40 CUP per dependent child under 18
    - Plus por Peligrosidad: hazard pay (configurable amount)
    - Plus Turno Nocturno: night shift allowance
    - Deducción Seguridad Social: 5% mandatory SS contribution (worker's share)
    """
    _inherit = 'hr.version'

    # ─── Cuban allowances (percepciones) ───────────────────────────────────
    plus_peligrosidad = fields.Monetary(
        string='Plus Peligrosidad (CUP)',
        default=0.0,
        currency_field='currency_id',
        help='Compensación adicional por trabajo peligroso o insalubre',
    )
    plus_nocturno = fields.Monetary(
        string='Plus Turno Nocturno (CUP)',
        default=0.0,
        currency_field='currency_id',
        help='Compensación mensual por trabajar en turno nocturno',
    )

    # ─── Computed Cuban fields ──────────────────────────────────────────────
    antiguedad_years = fields.Integer(
        string='Años de Antigüedad',
        compute='_compute_antiguedad',
        store=False,
        help='Años de antigüedad desde la fecha de inicio del contrato',
    )
    plus_antiguedad_pct = fields.Float(
        string='% Plus Antigüedad',
        compute='_compute_antiguedad',
        store=False,
        help='Porcentaje de plus por antigüedad (1% por año, máx 20%)',
    )
    plus_antiguedad = fields.Monetary(
        string='Plus Antigüedad (CUP)',
        compute='_compute_antiguedad',
        store=False,
        currency_field='currency_id',
        help='Monto calculado del plus por antigüedad = salario básico × % antigüedad',
    )
    plus_hijos = fields.Monetary(
        string='Plus Hijos (CUP)',
        compute='_compute_plus_hijos',
        store=False,
        currency_field='currency_id',
        help='40 CUP × número de hijos menores del trabajador',
    )
    deduccion_seguridad_social = fields.Monetary(
        string='Deducción Seg. Social 5% (CUP)',
        compute='_compute_deduccion_ss',
        store=False,
        currency_field='currency_id',
        help='Aportación obligatoria del trabajador: 5% del salario básico',
    )
    salario_neto_estimado = fields.Monetary(
        string='Salario Neto Estimado (CUP)',
        compute='_compute_salario_neto',
        store=False,
        currency_field='currency_id',
        help='Estimación = salario básico + percepciones - deducción SS',
    )

    # ─── Compute methods ────────────────────────────────────────────────────
    @api.depends('contract_date_start', 'contract_wage')
    def _compute_antiguedad(self):
        today = fields.Date.today()
        for version in self:
            if version.contract_date_start:
                delta = relativedelta(today, version.contract_date_start)
                years = delta.years
            else:
                years = 0
            pct = min(years * 0.01, 0.20)  # 1% per year, max 20%
            version.antiguedad_years = years
            version.plus_antiguedad_pct = pct * 100
            version.plus_antiguedad = version.contract_wage * pct

    @api.depends('employee_id.num_hijos')
    def _compute_plus_hijos(self):
        for version in self:
            num_hijos = version.employee_id.num_hijos or 0
            version.plus_hijos = num_hijos * 40.0  # 40 CUP per child

    @api.depends('contract_wage')
    def _compute_deduccion_ss(self):
        for version in self:
            version.deduccion_seguridad_social = version.contract_wage * 0.05  # 5%

    @api.depends(
        'contract_wage', 'plus_antiguedad', 'plus_hijos',
        'plus_peligrosidad', 'plus_nocturno', 'deduccion_seguridad_social'
    )
    def _compute_salario_neto(self):
        for version in self:
            gross = (
                version.contract_wage
                + version.plus_antiguedad
                + version.plus_hijos
                + version.plus_peligrosidad
                + version.plus_nocturno
            )
            version.salario_neto_estimado = gross - version.deduccion_seguridad_social
