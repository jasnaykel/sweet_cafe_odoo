# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.
"""
Declaración Jurada Anual — ONAT Cuba.

Consolida las declaraciones mensuales (anticipos) del año fiscal,
calcula el IS anual real usando la escala progresiva de tramos configurada,
compara contra el total de anticipos pagados y determina la diferencia:
  + positivo → deuda con la ONAT (pago complementario)
  - negativo  → crédito a favor del contribuyente (devolución)

Respaldo normativo:
  - Ley 113 del Sistema Tributario (Arts. 3–40)
  - Decreto 308/2012 del Consejo de Ministros
  - Resoluciones vigentes del MFP/ONAT
"""

from odoo import api, fields, models, _
from odoo.exceptions import UserError, ValidationError


class SweetDeclaracionAnual(models.Model):
    """Declaración Jurada Anual de impuestos para la ONAT."""

    _name = 'sweet.declaracion.anual'
    _description = 'Declaración Jurada Anual — Sweet Café'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'year desc'
    _rec_name = 'display_name'

    # ── Identificación ──────────────────────────────
    year = fields.Integer(
        string='Año Fiscal',
        required=True,
        default=lambda self: fields.Date.today().year - 1,
    )
    company_id = fields.Many2one(
        'res.company', string='Empresa',
        default=lambda self: self.env.company, required=True,
    )
    currency_id = fields.Many2one(
        'res.currency', related='company_id.currency_id', readonly=True,
    )
    display_name = fields.Char(compute='_compute_display_name', store=True)
    state = fields.Selection([
        ('draft', 'Borrador'),
        ('computed', 'Calculada'),
        ('submitted', 'Presentada'),
    ], default='draft', tracking=True, string='Estado', copy=False)

    # ── Declaraciones mensuales vinculadas ───────────
    monthly_report_ids = fields.Many2many(
        'sweet.onat.report',
        'sweet_declaracion_anual_monthly_rel',
        'declaracion_id', 'monthly_id',
        string='Declaraciones Mensuales (Anticipos)',
        domain="[('company_id', '=', company_id), ('year', '=', year)]",
    )
    monthly_count = fields.Integer(
        string='Meses Declarados', compute='_compute_from_monthly', store=True,
    )

    # ── Bases anuales (sumatorio mensual) ────────────
    annual_gross_income = fields.Monetary(
        string='Ingresos Brutos Anuales', compute='_compute_from_monthly', store=True,
    )
    annual_purchases = fields.Monetary(
        string='Gastos Deducibles Anuales', compute='_compute_from_monthly', store=True,
    )
    annual_net_income = fields.Monetary(
        string='Ingresos Netos Anuales (Base IS)',
        compute='_compute_from_monthly', store=True,
    )
    annual_wages = fields.Monetary(
        string='Salarios Anuales', compute='_compute_from_monthly', store=True,
    )

    # ── IS anual calculado por tramos progresivos ────
    annual_income_tax = fields.Monetary(
        string='IS Anual (Progresivo)',
        compute='_compute_annual_taxes', store=True,
        help='IS calculado sobre los ingresos netos anuales reales, aplicando la escala progresiva.',
    )
    annual_iuft = fields.Monetary(
        string='IUFT Anual', compute='_compute_annual_taxes', store=True,
    )
    annual_css = fields.Monetary(
        string='CSS Empleador Anual', compute='_compute_annual_taxes', store=True,
    )
    annual_sales_tax = fields.Monetary(
        string='IS Ventas Anual', compute='_compute_annual_taxes', store=True,
    )
    annual_territorial = fields.Monetary(
        string='Contribución Territorial Anual', compute='_compute_annual_taxes', store=True,
    )
    total_annual_tax = fields.Monetary(
        string='Total Impuestos Anuales', compute='_compute_annual_taxes', store=True,
    )

    # ── Anticipos ya pagados (suma de mensuales) ─────
    total_is_anticipos = fields.Monetary(
        string='Anticipos IS Pagados', compute='_compute_from_monthly', store=True,
    )
    total_iuft_anticipos = fields.Monetary(
        string='Anticipos IUFT Pagados', compute='_compute_from_monthly', store=True,
    )
    total_css_anticipos = fields.Monetary(
        string='Anticipos CSS Pagados', compute='_compute_from_monthly', store=True,
    )
    total_sales_tax_anticipos = fields.Monetary(
        string='Anticipos IS Ventas Pagados', compute='_compute_from_monthly', store=True,
    )
    total_territorial_anticipos = fields.Monetary(
        string='Anticipos Territorial Pagados', compute='_compute_from_monthly', store=True,
    )
    total_anticipos = fields.Monetary(
        string='Total Anticipos Pagados', compute='_compute_from_monthly', store=True,
    )

    # ── Diferencia final ─────────────────────────────
    difference = fields.Monetary(
        string='Diferencia (+ a Pagar / − a Favor)',
        compute='_compute_difference', store=True,
        help='Positivo: deuda con la ONAT. Negativo: crédito a favor del contribuyente.',
    )

    # ── Tasas de referencia ──────────────────────────
    labor_tax_rate_ref = fields.Float(
        string='Tasa IUFT de Referencia (%)', digits=(5, 2),
        compute='_compute_from_monthly', store=True,
    )
    social_security_rate_ref = fields.Float(
        string='Tasa CSS de Referencia (%)', digits=(5, 2),
        compute='_compute_from_monthly', store=True,
    )
    sales_tax_rate_ref = fields.Float(
        string='Tasa IS Ventas de Referencia (%)', digits=(5, 2),
        compute='_compute_from_monthly', store=True,
    )
    territorial_tax_rate_ref = fields.Float(
        string='Tasa Territorial (%)', digits=(5, 2), default=1.5,
    )

    # ── Pago de la DJ Anual ──────────────────────────
    payment_date = fields.Date(string='Fecha de Pago DJ Anual')
    payment_reference = fields.Char(
        string='Referencia de Pago ONAT',
        help='Número de operación bancaria o recibo de la ONAT.',
    )
    payment_amount = fields.Monetary(string='Monto Pagado (CUP)')

    notes = fields.Text(string='Observaciones / Notas de Conciliación')

    # ── Computes ─────────────────────────────────────

    @api.depends('year')
    def _compute_display_name(self):
        for rec in self:
            rec.display_name = 'DJ Anual %d' % rec.year

    @api.depends(
        'monthly_report_ids',
        'monthly_report_ids.gross_income',
        'monthly_report_ids.total_purchases',
        'monthly_report_ids.net_income',
        'monthly_report_ids.total_wages',
        'monthly_report_ids.income_tax',
        'monthly_report_ids.labor_tax',
        'monthly_report_ids.social_security',
        'monthly_report_ids.sales_tax',
        'monthly_report_ids.territorial_tax',
        'monthly_report_ids.labor_tax_rate',
        'monthly_report_ids.social_security_rate',
        'monthly_report_ids.sales_tax_rate',
    )
    def _compute_from_monthly(self):
        for rec in self:
            reports = rec.monthly_report_ids
            rec.monthly_count = len(reports)
            rec.annual_gross_income = sum(reports.mapped('gross_income'))
            rec.annual_purchases = sum(reports.mapped('total_purchases'))
            rec.annual_net_income = sum(reports.mapped('net_income'))
            rec.annual_wages = sum(reports.mapped('total_wages'))
            rec.total_is_anticipos = sum(reports.mapped('income_tax'))
            rec.total_iuft_anticipos = sum(reports.mapped('labor_tax'))
            rec.total_css_anticipos = sum(reports.mapped('social_security'))
            rec.total_sales_tax_anticipos = sum(reports.mapped('sales_tax'))
            rec.total_territorial_anticipos = sum(reports.mapped('territorial_tax'))
            rec.total_anticipos = (
                rec.total_is_anticipos + rec.total_iuft_anticipos
                + rec.total_css_anticipos + rec.total_sales_tax_anticipos
                + rec.total_territorial_anticipos
            )
            # Use rates from the most recent monthly report as reference
            last = reports.sorted(key=lambda r: int(r.month), reverse=True)[:1]
            rec.labor_tax_rate_ref = last.labor_tax_rate if last else 5.0
            rec.social_security_rate_ref = last.social_security_rate if last else 14.0
            rec.sales_tax_rate_ref = last.sales_tax_rate if last else 0.0

    @api.depends(
        'annual_net_income', 'annual_wages', 'annual_gross_income',
        'labor_tax_rate_ref', 'social_security_rate_ref',
        'sales_tax_rate_ref', 'territorial_tax_rate_ref',
    )
    def _compute_annual_taxes(self):
        for rec in self:
            rec.annual_income_tax = rec._progressive_is_annual(rec.annual_net_income)
            rec.annual_iuft = rec.annual_wages * rec.labor_tax_rate_ref / 100.0
            rec.annual_css = rec.annual_wages * rec.social_security_rate_ref / 100.0
            rec.annual_sales_tax = rec.annual_gross_income * rec.sales_tax_rate_ref / 100.0
            rec.annual_territorial = rec.annual_gross_income * rec.territorial_tax_rate_ref / 100.0
            rec.total_annual_tax = (
                rec.annual_income_tax + rec.annual_iuft + rec.annual_css
                + rec.annual_sales_tax + rec.annual_territorial
            )

    @api.depends('total_annual_tax', 'total_anticipos')
    def _compute_difference(self):
        for rec in self:
            rec.difference = rec.total_annual_tax - rec.total_anticipos

    def _progressive_is_annual(self, annual_net):
        """Calcula el IS anual aplicando los tramos progresivos configurados."""
        if annual_net <= 0:
            return 0.0
        brackets = self.env['sweet.tax.bracket'].search(
            [('tax_type', '=', 'is_income'), ('active', '=', True)],
            order='limit_from',
        )
        if not brackets:
            return 0.0
        total_tax = 0.0
        for bracket in brackets:
            limit_from = bracket.limit_from
            limit_to = bracket.limit_to if bracket.limit_to > 0 else float('inf')
            if annual_net <= limit_from:
                break
            taxable = min(annual_net, limit_to) - limit_from
            if taxable > 0:
                total_tax += taxable * bracket.rate / 100.0
        return total_tax

    # ── Constraints ───────────────────────────────────

    @api.constrains('year', 'company_id')
    def _check_unique_year_company(self):
        for rec in self:
            if self.search([
                ('year', '=', rec.year),
                ('company_id', '=', rec.company_id.id),
                ('id', '!=', rec.id),
            ]):
                raise ValidationError(_(
                    'Ya existe una Declaración Jurada Anual para el año %d '
                    'en esta empresa.'
                ) % rec.year)

    # ── ORM overrides (protección de integridad) ──────

    _IMMUTABLE_FIELDS = frozenset({
        'year', 'company_id',
        'annual_gross_income', 'annual_purchases', 'annual_net_income',
        'annual_income_tax', 'total_annual_tax',
        'monthly_report_ids',
    })

    def write(self, vals):
        submitted = self.filtered(lambda r: r.state == 'submitted')
        if submitted:
            forbidden = set(vals.keys()) & self._IMMUTABLE_FIELDS
            if forbidden:
                raise UserError(_(
                    'La Declaración Jurada Anual ya fue presentada a la ONAT '
                    'y no puede modificarse. Campos bloqueados: %s'
                ) % ', '.join(sorted(forbidden)))
        return super().write(vals)

    def unlink(self):
        if any(r.state == 'submitted' for r in self):
            raise UserError(_(
                'No puede eliminar una Declaración Jurada Anual ya '
                'presentada a la ONAT.'
            ))
        return super().unlink()

    # ── Acciones ──────────────────────────────────────

    def action_load_monthly_reports(self):
        """Vincula automáticamente las declaraciones mensuales del año."""
        self.ensure_one()
        reports = self.env['sweet.onat.report'].search([
            ('year', '=', self.year),
            ('company_id', '=', self.company_id.id),
            ('state', 'in', ('computed', 'submitted')),
        ])
        self.monthly_report_ids = reports
        self.message_post(
            body=_('Se vincularon %d declaraciones mensuales del año %d.')
            % (len(reports), self.year)
        )

    def action_compute(self):
        """Calcula la DJ Anual desde las declaraciones mensuales vinculadas."""
        self.ensure_one()
        if not self.monthly_report_ids:
            self.action_load_monthly_reports()
        self.state = 'computed'
        self.message_post(
            body=_('DJ Anual calculada. %d meses vinculados. '
                   'Diferencia: %s CUP')
            % (self.monthly_count, '{:,.2f}'.format(self.difference))
        )

    def action_submit(self):
        """Presenta la Declaración Jurada Anual a la ONAT."""
        for rec in self:
            if rec.state != 'computed':
                raise ValidationError(_(
                    'Calcule primero la declaración anual antes de presentarla.'
                ))
            if not rec.monthly_report_ids:
                raise ValidationError(_(
                    'No hay declaraciones mensuales vinculadas para el año %d.'
                ) % rec.year)
            rec.state = 'submitted'
            rec.message_post(
                body=_('Declaración Jurada Anual %d presentada a la ONAT. '
                       'Diferencia: %s CUP')
                % (rec.year, '{:,.2f}'.format(rec.difference))
            )

    def action_reset_to_draft(self):
        """Regresa a borrador (solo administradores)."""
        self.state = 'draft'
        self.message_post(body=_('Declaración regresada a borrador para correcciones.'))

    def action_print_pdf(self):
        """Genera el PDF de la Declaración Jurada Anual."""
        self.ensure_one()
        return self.env.ref(
            'sweet_cafe_management.action_report_declaracion_anual'
        ).report_action(self)
