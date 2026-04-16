# Part of Sweet Café Management. See LICENSE file for full copyright and licensing details.

from odoo import fields, models


class ResCompany(models.Model):
    """Extends res.company with Sweet Café multi-branch and Cuban fiscal configuration."""

    _inherit = 'res.company'

    # ── Multi-sucursal ─────────────────────────────
    allow_cup_mlc = fields.Boolean(
        string='Habilitar Doble Moneda (CUP/MLC)',
        default=False,
        help='Permite registrar pagos en CUP y MLC en el POS',
    )
    main_branch_id = fields.Many2one(
        'sweet.branch',
        string='Sucursal Principal (Matriz)',
        help='Sucursal matriz de esta compañía',
    )

    # ── Identificación Legal (Cuba) ────────────────
    nit = fields.Char(
        string='NIT (Número de Identificación Tributaria)',
        size=30,
        help='Número de Identificación Tributaria asignado por la ONAT. '
             'Obligatorio en todas las facturas y declaraciones fiscales.',
    )
    legal_type = fields.Selection(
        selection=[
            ('tcp', 'TCP — Trabajador por Cuenta Propia'),
            ('mipyme', 'MIPYME — Micro, Pequeña o Mediana Empresa'),
            ('cna', 'CNA — Cooperativa No Agropecuaria'),
        ],
        string='Figura Legal',
        help='Forma jurídica bajo la que opera el negocio según la legislación cubana.',
    )
    constitution_resolution_number = fields.Char(
        string='Nº Resolución de Constitución',
        help='Número de la Resolución que aprobó la constitución del TCP o MIPYME.',
    )
    economic_activity = fields.Char(
        string='Actividad Económica Autorizada',
        help='Descripción de la actividad principal según la licencia o autorización.',
    )
    economic_activity_code = fields.Char(
        string='Código ONEI de Actividad',
        size=10,
        help='Código de la actividad económica según la nomenclatura ONEI.',
    )

    # ── Inscripción ONAT ───────────────────────────
    onat_registration_number = fields.Char(
        string='Nº de Inscripción ONAT',
        help='Número asignado al contribuyente en el registro de la ONAT.',
    )
    onat_office = fields.Char(
        string='Oficina ONAT',
        help='Nombre de la oficina o municipio de la ONAT donde está inscrito.',
    )
    onat_registration_date = fields.Date(
        string='Fecha de Inscripción ONAT',
        help='Fecha en que el negocio quedó oficialmente inscrito en la ONAT.',
    )

    # ── Cuenta Bancaria Fiscal ─────────────────────
    fiscal_bank_account_id = fields.Many2one(
        'res.partner.bank',
        string='Cuenta Bancaria Fiscal',
        domain="[('partner_id', '=', partner_id)]",
        help='Cuenta bancaria registrada en la ONAT para operaciones del negocio '
             'y pagos tributarios. Obligatoria según la Ley 113.',
    )
