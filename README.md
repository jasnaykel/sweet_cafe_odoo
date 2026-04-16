# Sweet Café — Sistema de Gestión Integral en Odoo 19

Sistema modular desarrollado sobre **Odoo 19** para la gestión integral de una cadena de pastelerías/dulcerías cubanas, con **cumplimiento fiscal completo** conforme a la Ley 113 del Sistema Tributario, el Decreto 308/2012 y las resoluciones vigentes del MFP/ONAT.

---

## Módulos del Proyecto

### 🍰 Módulos principales

| Módulo                  | Descripción                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `sweet_cafe_management` | Gestión integral: sucursales, inventario, RRHH, nómina, POS, fiscal ONAT |
| `sweet_cafe_ecommerce`  | Sitio web y tienda online con diseño personalizado para pastelería       |

### 🇨🇺 Localización Cubana (RRHH)

| Módulo                         | Descripción                                                               |
| ------------------------------ | ------------------------------------------------------------------------- |
| `l10n_cu_address`              | Provincias y municipios de Cuba                                           |
| `l10n_cu_banks`                | Bancos cubanos                                                            |
| `l10n_cu_hr`                   | Empleados: categorías ocupacionales, nivel escolar, profesiones, horarios |
| `l10n_cu_hr_contract`          | Base de contratos laborales adaptada a legislación cubana (hr.version)    |
| `l10n_cu_hr_employee_contract` | Contratos determinados/indeterminados, tipos, proformas                   |
| `l10n_cu_hr_payroll`           | Nóminas con escalas salariales en CUP                                     |
| `l10n_cu_hr_payroll_movement`  | Movimientos de nómina: altas, bajas, cambios internos                     |
| `rrhh_5p`                      | Reportes adicionales de contratos (proformas 5pCuba)                      |

---

## Funcionalidades

### Gestión de Pastelería (`sweet_cafe_management`)

- **Multi-sucursal**: gestión de múltiples puntos de venta y almacenes
- **Inventario**: control de mermas con flujo de aprobación, trazabilidad de lotes y caducidad
- **Catálogo de productos**: variantes por sabor (Cakes Antillanos, Tartaletas, Galletas, Chocolates, etc.)
- **Punto de Venta (POS)**: configuración multi-sucursal con doble moneda CUP/MLC
- **RRHH cubano**: escalas salariales 1–18 en CUP, antigüedad, SS, hijos, peligrosidad
- **Seguridad por roles**: Cajero, Repostero, Almacenista, RRHH, Gerente, Administrador

### 🏛️ Cumplimiento Fiscal ONAT (Ley 113 / Decreto 308/2012)

#### Configuración Fiscal de Empresa (`res.company`)

- **NIT** (Número de Identificación Tributaria) — aparece en facturas y declaraciones
- **Figura legal**: TCP, MIPYME o CNA
- **Actividad económica** con código ONEI (actividad gastronómica)
- **Número de resolución de constitución** del negocio
- **Inscripción ONAT**: número, oficina y fecha de registro
- **Cuenta bancaria fiscal** obligatoria (obligación Ley 113)

#### Tramos IS Progresivo (`sweet.tax.bracket`)

- Escala progresiva del IS pre-cargada con 9 tramos (Decreto 308/2012):
  - 0 % hasta 10.000 CUP/año (exento)
  - 15 % de 10.001 a 20.000 CUP/año
  - 20 % de 20.001 a 30.000 CUP/año ... hasta 50 % sobre 150.000 CUP/año
- Tramos editables desde la interfaz (Configuración → Tramos IS Progresivo)
- Fallback a tasa plana si no hay tramos configurados

#### Declaración Mensual ONAT (`sweet.onat.report`)

- **IS progresivo por tramos**: anualiza el ingreso neto mensual, aplica la escala y divide el resultado mensual (método "anticipo")
- **IUFT** (Impuesto por Utilización de la Fuerza de Trabajo)
- **CSS** — Contribución a la Seguridad Social del empleador (14%)
- **IS Ventas** — si aplica según vector fiscal
- **Contribución Territorial** al municipio (1,5% configurable, Ley 113 Art. 231–240)
- Cálculo automático desde `account.move` (facturas de venta y compra)
- Campos de pago: fecha, referencia bancaria, monto pagado
- **Bloqueo de integridad**: declaraciones presentadas no pueden modificarse ni eliminarse
- Solo el administrador puede revertir una declaración presentada
- Exportación/importación CSV

#### Libro de Ingresos y Gastos (`sweet.libro.igi`)

- Registro diario de ingresos y gastos por período mensual
- Campos por línea: fecha, descripción, tipo (ingreso/gasto), método de cobro (efectivo/transferencia/QR-MLC), tipo de comprobante (factura, SC-09, aduana, ticket POS, etc.), número de comprobante
- Importación automática de facturas contabilizadas de Odoo
- Totales por método de cobro: efectivo, transferencia, QR/MLC
- Enlace directo al asiento/factura de Odoo para trazabilidad
- Estados: Abierto → Cerrado (protegido contra modificación accidental)
- Solo el administrador puede reabrir un libro cerrado

#### Declaración Jurada Anual (`sweet.declaracion.anual`)

- Consolida automáticamente todas las declaraciones mensuales del año
- Calcula el **IS anual REAL** aplicando la escala progresiva sobre el ingreso neto ANUAL total (no estimado mes a mes)
- Compara el IS anual real con el total de anticipos pagados:
  - **Diferencia positiva** → deuda complementaria con la ONAT
  - **Diferencia negativa** → crédito a favor (devolución)
- Muestra la conciliación completa: IS, IUFT, CSS, IS Ventas, Territorial
- Registro de pago de la DJ Anual (fecha, referencia, monto)
- Estados: Borrador → Calculada → Presentada (irreversible sin admin)
- Bloqueo de eliminación de declaraciones presentadas

### E-commerce (`sweet_cafe_ecommerce`)

- Página de inicio premium con hero, sabores, nosotros, sucursales y pedidos especiales
- **Sección "Más Vendidos"**: 8 productos más vendidos en tiempo real con badge de stock
- **Formulario de reservas online** (`/reservar`): pedidos especiales desde el sitio web
- Snippets arrastrables para el editor web de Odoo
- Tienda online con plantilla de producto para pastelería
- SCSS personalizado con paleta artesanal

### Reservas (`sweet.reservation`)

- Flujo: Borrador → Confirmada → Lista para Entrega → Entregada / Cancelada
- Formulario público en `/reservar` para clientes sin cuenta Odoo
- Numeración automática `RESV/YYYY/NNNN`

---

## Cobertura Legal ONAT

| Requisito Legal                | Estado      | Módulo/Campo                         |
| ------------------------------ | ----------- | ------------------------------------ |
| NIT registrado                 | ✅ Completo | `res.company.nit`                    |
| Figura legal TCP/MIPYME        | ✅ Completo | `res.company.legal_type`             |
| Actividad económica + ONEI     | ✅ Completo | `res.company.economic_activity*`     |
| Inscripción ONAT + oficina     | ✅ Completo | `res.company.onat_*`                 |
| Cuenta bancaria fiscal         | ✅ Completo | `res.company.fiscal_bank_account_id` |
| IS progresivo por tramos       | ✅ Completo | `sweet.tax.bracket`                  |
| Contribución Territorial       | ✅ Completo | `sweet.onat.report.territorial_tax`  |
| Libro Ingresos y Gastos        | ✅ Completo | `sweet.libro.igi`                    |
| Declaraciones mensuales ONAT   | ✅ Completo | `sweet.onat.report`                  |
| Anticipos con registro de pago | ✅ Completo | `payment_date`, `payment_reference`  |
| Declaración Jurada Anual       | ✅ Completo | `sweet.declaracion.anual`            |
| Conciliación anual (diff.)     | ✅ Completo | `difference` field                   |
| Bloqueo de registros fiscales  | ✅ Completo | `write()` / `unlink()` overrides     |
| Trazabilidad por comprobante   | ✅ Completo | `document_type`, `document_ref`      |

---

## Requisitos Técnicos

- **Odoo**: 19.0
- **Python**: 3.11+
- **PostgreSQL**: 15+
- **Módulos nativos requeridos**: `hr`, `hr_attendance`, `hr_holidays`, `point_of_sale`, `sale_management`, `sale_pdf_quote_builder`, `purchase`, `account`, `stock`, `mrp`, `product`, `website`, `website_sale`

---

## Instalación

### Con Docker (recomendado)

```bash
git clone https://github.com/jasnaykel/sweet_cafe_odoo.git
cd sweet_cafe_odoo
docker compose up -d
```

Instalar desde el menú **Aplicaciones** de Odoo en este orden:

1. `l10n_cu_address`
2. `l10n_cu_banks`
3. `l10n_cu_hr`
4. `l10n_cu_hr_contract`
5. `l10n_cu_hr_employee_contract`
6. `l10n_cu_hr_payroll_movement`
7. `sweet_cafe_management`
8. `sweet_cafe_ecommerce`

### Configuración inicial obligatoria

Tras la instalación, ir a **Sweet Café → Configuración → Empresa** y completar:

1. **NIT** asignado por la ONAT
2. **Figura legal** (TCP / MIPYME / CNA)
3. **Actividad económica** y código ONEI
4. **Datos de inscripción ONAT** (número, oficina, fecha)
5. **Cuenta bancaria fiscal**

Verificar los **Tramos IS** en **Configuración → Tramos IS Progresivo** y actualizarlos si han cambiado por resolución del MFP.

---

## Estructura del Repositorio

```
sweet_cafe_odoo/
├── sweet_cafe_management/
│   ├── models/
│   │   ├── res_company.py           # Campos fiscales NIT, figura legal, ONAT
│   │   ├── sweet_onat_report.py     # Declaración mensual ONAT (IS progresivo)
│   │   ├── sweet_tax_bracket.py     # Tramos IS progresivo (Decreto 308/2012)
│   │   ├── sweet_libro_igi.py       # Libro de Ingresos y Gastos
│   │   ├── sweet_declaracion_anual.py # DJ Anual con conciliación
│   │   ├── sweet_branch.py          # Sucursales
│   │   ├── sweet_scrap.py           # Control de mermas
│   │   └── ...                      # Otros modelos
│   ├── views/
│   │   ├── res_company_views.xml    # Pestaña Fiscal Cuba en empresa
│   │   ├── sweet_tax_bracket_views.xml
│   │   ├── sweet_onat_report_views.xml
│   │   ├── sweet_libro_igi_views.xml
│   │   ├── sweet_declaracion_anual_views.xml
│   │   └── ...
│   ├── data/
│   │   ├── sweet_tax_brackets.xml   # Tramos IS preconfigurados
│   │   └── ...
│   ├── security/                    # Grupos y ACL para todos los modelos
│   └── wizard/                      # Exportar/Importar ONAT, aprobar mermas
├── sweet_cafe_ecommerce/
├── l10n_cu_*/                       # Localización cubana RRHH
└── rrhh_5p/
```

---

## Autor

**Sweet Café** — Jasnaykel@gmail.com

## Licencia

LGPL-3
