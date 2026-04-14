# Sweet Café — Sistema de Gestión Integral en Odoo 19

Sistema modular desarrollado sobre **Odoo 19** para la gestión integral de una cadena de pastelerías/dulcerías cubanas. Incluye módulos de localización cubana (RRHH, contratos, nómina) y módulos propios de gestión y e-commerce.

---

## Módulos del Proyecto

### 🍰 Módulos principales

| Módulo                  | Descripción                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `sweet_cafe_management` | Gestión integral: sucursales, inventario, RRHH, nómina, POS, reportes |
| `sweet_cafe_ecommerce`  | Sitio web y tienda online con diseño personalizado para pastelería    |

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
- **Inventario**: control de mermas, consumo productivo, traspasos entre sucursales
- **Catálogo de productos**: variantes por sabor (Cakes Antillanos, Tartaletas, Galletas, Chocolates, etc.)
- **Punto de Venta (POS)**: configuración multi-sucursal
- **Compras y ventas**: integrado con módulos nativos de Odoo
- **Lotes y caducidad**: trazabilidad de productos perecederos
- **RRHH cubano**: escalas salariales en CUP, empleados con datos de legislación cubana
- **Nómina**: reporte de nómina adaptado a Cuba
- **Seguridad**: grupos y reglas de acceso por sucursal

### E-commerce (`sweet_cafe_ecommerce`)

- Página de inicio personalizada con hero, sabores, nosotros, sucursales y pedidos especiales
- Snippets de arrastrar-y-soltar para el editor web de Odoo
- Tienda online con plantilla de producto para pastelería
- Carrusel de productos destacados
- Paleta de colores y tipografía artesanal (SCSS personalizado)

### Localización Cubana (RRHH)

- Catálogo completo de provincias y municipios de Cuba
- Directorio de bancos cubanos
- Categorías ocupacionales y niveles de escolaridad
- Contratos laborales: determinados, indeterminados, tipos de contrato
- Secuencia automática de numeración de contratos
- Movimientos de nómina: registro de altas, bajas y cambios internos
- Reportes de contratos próximos a vencer
- Reporte de comportamiento de la contratación de fuerza de trabajo

---

## Requisitos Técnicos

- **Odoo**: 19.0
- **Python**: 3.11+
- **Módulos nativos de Odoo requeridos**: `hr`, `hr_attendance`, `hr_holidays`, `point_of_sale`, `sale_management`, `purchase`, `account`, `stock`, `mrp`, `product`, `website`, `website_sale`

---

## Instalación

### Con Docker (recomendado)

```bash
git clone https://github.com/jasnaykel/sweet_cafe_odoo.git
cd sweet_cafe_odoo
docker compose up -d
```

Luego instalar en la base de datos desde el menú **Aplicaciones** de Odoo:

1. `l10n_cu_address`
2. `l10n_cu_banks`
3. `l10n_cu_hr`
4. `l10n_cu_hr_contract`
5. `l10n_cu_hr_employee_contract`
6. `l10n_cu_hr_payroll_movement`
7. `sweet_cafe_management`
8. `sweet_cafe_ecommerce`

O en una sola línea desde la terminal:

```bash
docker exec <contenedor_odoo> odoo -c /etc/odoo/odoo.conf \
  -i l10n_cu_address,l10n_cu_banks,l10n_cu_hr,l10n_cu_hr_contract,\
l10n_cu_hr_employee_contract,l10n_cu_hr_payroll_movement,\
sweet_cafe_management,sweet_cafe_ecommerce \
  -d <nombre_bd> --stop-after-init
```

---

## Estructura del Repositorio

```
sweet_cafe_odoo/
├── sweet_cafe_management/       # Módulo principal de gestión
│   ├── models/                  # Modelos: producto, empleado, contrato, sucursal
│   ├── views/                   # Vistas: menús, formularios, listas
│   ├── report/                  # Reportes PDF (mermas, nómina)
│   ├── security/                # Grupos y reglas de acceso
│   ├── data/                    # Datos iniciales (categorías, atributos, escalas)
│   └── wizard/                  # Asistentes (aprobación de mermas)
├── sweet_cafe_ecommerce/        # Módulo de sitio web y tienda online
│   ├── views/                   # Plantillas QWeb y snippets
│   └── static/src/scss/         # Estilos personalizados
├── l10n_cu_address/             # Municipios y provincias de Cuba
├── l10n_cu_banks/               # Bancos cubanos
├── l10n_cu_hr/                  # RRHH base cubano
├── l10n_cu_hr_contract/         # Contratos base (hr.version)
├── l10n_cu_hr_employee_contract/# Contratos de empleados con tipos cubanos
├── l10n_cu_hr_payroll/          # Nóminas
├── l10n_cu_hr_payroll_movement/ # Movimientos de nómina
└── rrhh_5p/                     # Reportes adicionales de contratos
```

---

## Autor

**Sweet Café** — https://sweetcafe.cu

## Licencia

LGPL-3
