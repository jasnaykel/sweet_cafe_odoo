/** @odoo-module **/
/**
 * Sweet Café — Configurador Interactivo de Productos
 *
 * Editor visual basado en Fabric.js que permite:
 *  - Cargar la imagen base generada por IA
 *  - Añadir adornos (emoji / SVG) al canvas
 *  - Añadir texto editable
 *  - Dibujar a mano alzada
 *  - Insertar formas geométricas
 *  - Controlar color, escala, rotación y opacidad de cada elemento
 *  - Deshacer / rehacer
 *  - Exportar a PNG
 *  - Guardar el estado para edición futura
 */
import publicWidget from "@web/legacy/js/public/public_widget";

publicWidget.registry.SweetConfigurator = publicWidget.Widget.extend({
  selector: ".sc-configurator-page",

  async start() {
    await this._super(...arguments);
    this._initState();
    this._initCanvas();
    this._bindConfigPanel();
    this._bindCanvasTools();
    this._bindAdornos();
    this._bindShapes();
    this._bindObjectControls();
    this._bindActionButtons();
    this._designLoaded = false;
    await this._loadExistingDesign();
    // Auto-load product image onto canvas if no existing design
    if (!this._designLoaded && this.productImageUrl && this.canvas) {
      await this._setCanvasBackground(this.productImageUrl);
      const ph = this.el.querySelector("#canvas-placeholder");
      if (ph) ph.style.display = "none";
      this._enableActions();
    }
  },

  // ════════════════════════════════════════════
  //  Initialization
  // ════════════════════════════════════════════

  _initState() {
    this.productId = parseInt(
      this.el.querySelector("#cfg-product-id")?.value || "0",
    );
    this.designId = this.el.querySelector("#cfg-design-id")?.value || null;
    this.productImageUrl =
      this.el.querySelector("#cfg-product-image")?.value || "";
    this._history = [];
    this._historyIndex = -1;
    this._maxHistory = 50;
    this._skipHistory = false;
  },

  _initCanvas() {
    const canvasEl = this.el.querySelector("#design-canvas");
    if (!canvasEl) return;
    if (typeof fabric === "undefined") {
      console.error("Fabric.js not loaded — canvas editor unavailable");
      return;
    }

    // Responsive canvas — fit to container
    const container = this.el.querySelector(".sc-cfg-canvas-container");
    const maxW = container ? container.clientWidth - 2 : 600;
    const size = Math.min(maxW, 600);

    this.canvas = new fabric.Canvas("design-canvas", {
      width: size,
      height: size,
      backgroundColor: "#ffffff",
      preserveObjectStacking: true,
      selection: true,
    });

    // Events for object controls
    this.canvas.on("selection:created", () => this._showObjectControls());
    this.canvas.on("selection:updated", () => this._showObjectControls());
    this.canvas.on("selection:cleared", () => this._hideObjectControls());
    this.canvas.on("object:modified", () => this._saveHistory());
    this.canvas.on("object:added", () => {
      if (!this._skipHistory) this._saveHistory();
    });

    this._saveHistory();
  },

  // ════════════════════════════════════════════
  //  Configuration Panel Bindings
  // ════════════════════════════════════════════

  _bindConfigPanel() {
    // Button groups (single select)
    this.el
      .querySelectorAll(".sc-cfg-btn-group:not(.sc-cfg-multi)")
      .forEach((group) => {
        group.querySelectorAll(".sc-cfg-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            group
              .querySelectorAll(".sc-cfg-btn")
              .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
          });
        });
      });

    // Option grids (single select)
    this.el
      .querySelectorAll(".sc-cfg-option-grid:not(.sc-cfg-multi)")
      .forEach((grid) => {
        grid.querySelectorAll(".sc-cfg-option-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            grid
              .querySelectorAll(".sc-cfg-option-btn")
              .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            this._updateExtrasPrice();
          });
        });
      });

    // Option grids (multi select)
    this.el
      .querySelectorAll(".sc-cfg-option-grid.sc-cfg-multi")
      .forEach((grid) => {
        grid.querySelectorAll(".sc-cfg-option-btn").forEach((btn) => {
          btn.addEventListener("click", () => {
            btn.classList.toggle("active");
            this._updateExtrasPrice();
          });
        });
      });

    // Generate button
    const genBtn = this.el.querySelector("#btn-generate-ai");
    if (genBtn) {
      genBtn.addEventListener("click", () => this._generateAiImage());
    }
  },

  // ════════════════════════════════════════════
  //  Canvas Tools
  // ════════════════════════════════════════════

  _bindCanvasTools() {
    const bind = (id, fn) => {
      const el = this.el.querySelector("#" + id);
      if (el) el.addEventListener("click", fn.bind(this));
    };

    bind("tool-select", () => {
      if (!this.canvas) return;
      this.canvas.isDrawingMode = false;
      this.canvas.selection = true;
    });

    bind("tool-text", () => this._addText());

    bind("tool-draw", () => {
      if (!this.canvas) return;
      this.canvas.isDrawingMode = !this.canvas.isDrawingMode;
      if (this.canvas.isDrawingMode) {
        this.canvas.freeDrawingBrush.width = 3;
        this.canvas.freeDrawingBrush.color =
          this.el.querySelector("#cfg-color-accent")?.value || "#E8A0BF";
        this.el.querySelector("#tool-draw")?.classList.add("active");
      } else {
        this.el.querySelector("#tool-draw")?.classList.remove("active");
      }
    });

    bind("tool-delete", () => {
      if (!this.canvas) return;
      const active = this.canvas.getActiveObjects();
      active.forEach((obj) => {
        if (!obj._isBackground) this.canvas.remove(obj);
      });
      this.canvas.discardActiveObject();
      this._saveHistory();
    });

    bind("tool-undo", () => this._undo());
    bind("tool-redo", () => this._redo());

    bind("tool-zoom-in", () => {
      if (!this.canvas) return;
      const z = this.canvas.getZoom() * 1.15;
      this.canvas.setZoom(Math.min(z, 3));
    });

    bind("tool-zoom-out", () => {
      if (!this.canvas) return;
      const z = this.canvas.getZoom() / 1.15;
      this.canvas.setZoom(Math.max(z, 0.3));
    });

    bind("tool-zoom-reset", () => {
      if (!this.canvas) return;
      this.canvas.setZoom(1);
      this.canvas.absolutePan(new fabric.Point(0, 0));
    });
  },

  // ════════════════════════════════════════════
  //  Adornos (emojis / decorative elements)
  // ════════════════════════════════════════════

  _bindAdornos() {
    this.el.querySelectorAll(".sc-cfg-adorno-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const emoji = btn.textContent.trim();
        this._addAdorno(emoji);
      });
    });
  },

  _addAdorno(emoji) {
    if (!this.canvas) return;
    const text = new fabric.Text(emoji, {
      left: 150 + Math.random() * 300,
      top: 150 + Math.random() * 300,
      fontSize: 48,
      originX: "center",
      originY: "center",
      hasControls: true,
      hasBorders: true,
    });
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
  },

  // ════════════════════════════════════════════
  //  Geometric Shapes
  // ════════════════════════════════════════════

  _bindShapes() {
    this.el.querySelectorAll(".sc-cfg-shape-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._addShape(btn.dataset.shape);
      });
    });
  },

  _addShape(type) {
    if (!this.canvas) return;
    const color =
      this.el.querySelector("#cfg-color-accent")?.value || "#E8A0BF";
    let shape;
    const opts = {
      left: 200 + Math.random() * 200,
      top: 200 + Math.random() * 200,
      fill: color,
      opacity: 0.7,
      originX: "center",
      originY: "center",
    };

    switch (type) {
      case "circle":
        shape = new fabric.Circle({ ...opts, radius: 40 });
        break;
      case "rect":
        shape = new fabric.Rect({
          ...opts,
          width: 80,
          height: 60,
          rx: 8,
          ry: 8,
        });
        break;
      case "triangle":
        shape = new fabric.Triangle({ ...opts, width: 70, height: 70 });
        break;
      case "line":
        shape = new fabric.Line([0, 0, 120, 0], {
          ...opts,
          stroke: color,
          strokeWidth: 3,
          fill: "",
        });
        break;
    }
    if (shape) {
      this.canvas.add(shape);
      this.canvas.setActiveObject(shape);
    }
  },

  // ════════════════════════════════════════════
  //  Text
  // ════════════════════════════════════════════

  _addText() {
    if (!this.canvas) return;
    const msg = this.el.querySelector("#cfg-message")?.value || "Tu texto aquí";
    const fontSel = this.el.querySelector("#cfg-font")?.value || "cursive";
    const fontMap = {
      cursive: "Dancing Script, cursive",
      bold: "Georgia, serif",
      handwritten: "Caveat, cursive",
      modern: "Montserrat, sans-serif",
    };
    const color =
      this.el.querySelector("#cfg-color-secondary")?.value || "#5c3d2e";
    const text = new fabric.IText(msg, {
      left: 300,
      top: 300,
      fontFamily: fontMap[fontSel] || "Georgia, serif",
      fontSize: 28,
      fill: color,
      originX: "center",
      originY: "center",
      editable: true,
    });
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
  },

  // ════════════════════════════════════════════
  //  Object Controls
  // ════════════════════════════════════════════

  _bindObjectControls() {
    const colorInput = this.el.querySelector("#obj-color");
    const scaleInput = this.el.querySelector("#obj-scale");
    const rotInput = this.el.querySelector("#obj-rotation");
    const opacityInput = this.el.querySelector("#obj-opacity");

    if (colorInput) {
      colorInput.addEventListener("input", () => {
        const obj = this.canvas?.getActiveObject();
        if (!obj) return;
        if (obj.type === "i-text" || obj.type === "text") {
          obj.set("fill", colorInput.value);
        } else {
          obj.set("fill", colorInput.value);
        }
        this.canvas.renderAll();
      });
    }

    if (scaleInput) {
      scaleInput.addEventListener("input", () => {
        const obj = this.canvas?.getActiveObject();
        if (!obj) return;
        const s = parseInt(scaleInput.value) / 100;
        obj.scale(s);
        this.canvas.renderAll();
      });
    }

    if (rotInput) {
      rotInput.addEventListener("input", () => {
        const obj = this.canvas?.getActiveObject();
        if (!obj) return;
        obj.set("angle", parseInt(rotInput.value));
        this.canvas.renderAll();
      });
    }

    if (opacityInput) {
      opacityInput.addEventListener("input", () => {
        const obj = this.canvas?.getActiveObject();
        if (!obj) return;
        obj.set("opacity", parseInt(opacityInput.value) / 100);
        this.canvas.renderAll();
      });
    }
  },

  _showObjectControls() {
    const panel = this.el.querySelector("#object-controls");
    if (!panel || !this.canvas) return;
    panel.classList.remove("d-none");

    const obj = this.canvas.getActiveObject();
    if (!obj) return;

    const colorInput = this.el.querySelector("#obj-color");
    const scaleInput = this.el.querySelector("#obj-scale");
    const rotInput = this.el.querySelector("#obj-rotation");
    const opacityInput = this.el.querySelector("#obj-opacity");

    if (colorInput) colorInput.value = obj.fill || "#000000";
    if (scaleInput) scaleInput.value = Math.round((obj.scaleX || 1) * 100);
    if (rotInput) rotInput.value = Math.round(obj.angle || 0);
    if (opacityInput) opacityInput.value = Math.round((obj.opacity || 1) * 100);
  },

  _hideObjectControls() {
    const panel = this.el.querySelector("#object-controls");
    if (panel) panel.classList.add("d-none");
  },

  // ════════════════════════════════════════════
  //  History (Undo/Redo)
  // ════════════════════════════════════════════

  _saveHistory() {
    if (!this.canvas || this._skipHistory) return;
    const json = JSON.stringify(this.canvas.toJSON());
    // Truncate forward history
    this._history = this._history.slice(0, this._historyIndex + 1);
    this._history.push(json);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
    this._historyIndex = this._history.length - 1;
  },

  _undo() {
    if (!this.canvas || this._historyIndex <= 0) return;
    this._historyIndex--;
    this._restoreHistory();
  },

  _redo() {
    if (!this.canvas || this._historyIndex >= this._history.length - 1) return;
    this._historyIndex++;
    this._restoreHistory();
  },

  _restoreHistory() {
    this._skipHistory = true;
    this.canvas.loadFromJSON(this._history[this._historyIndex], () => {
      this.canvas.renderAll();
      this._skipHistory = false;
    });
  },

  // ════════════════════════════════════════════
  //  AI Image Generation
  // ════════════════════════════════════════════

  _gatherConfig() {
    const getActive = (id) => {
      const btn = this.el.querySelector(
        "#" + id + " .sc-cfg-btn.active, #" + id + " .sc-cfg-option-btn.active",
      );
      return btn?.dataset.value || "";
    };
    const getActiveName = (id) => {
      const btn = this.el.querySelector(
        "#" + id + " .sc-cfg-option-btn.active",
      );
      return (
        btn?.getAttribute("title") ||
        btn?.querySelector(".sc-cfg-option-name")?.textContent?.trim() ||
        ""
      );
    };
    const getActiveColor = (id) => {
      const btn = this.el.querySelector(
        "#" + id + " .sc-cfg-option-btn.active",
      );
      return btn?.dataset.color || "";
    };
    const getMulti = (id) => {
      return Array.from(
        this.el.querySelectorAll("#" + id + " .sc-cfg-option-btn.active"),
      )
        .map((b) => b.dataset.value)
        .filter(Boolean);
    };
    const getMultiNames = (id) => {
      return Array.from(
        this.el.querySelectorAll("#" + id + " .sc-cfg-option-btn.active"),
      )
        .map(
          (b) =>
            b.getAttribute("title") ||
            b.querySelector(".sc-cfg-option-name")?.textContent?.trim() ||
            "",
        )
        .filter(Boolean);
    };

    return {
      product_id: this.productId,
      design_id: this.designId || null,
      cake_layers: getActive("cfg-layers"),
      cake_shape: getActive("cfg-shape"),
      cake_size: this.el.querySelector("#cfg-size")?.value || "medium",
      flavor_id: getActive("cfg-flavor"),
      flavor_name: getActiveName("cfg-flavor"),
      flavor_color: getActiveColor("cfg-flavor"),
      filling_id: getActive("cfg-filling"),
      filling_name: getActiveName("cfg-filling"),
      filling_color: getActiveColor("cfg-filling"),
      frosting_id: getActive("cfg-frosting"),
      frosting_name: getActiveName("cfg-frosting"),
      frosting_color: getActiveColor("cfg-frosting"),
      decoration_ids: getMulti("cfg-decorations"),
      decoration_names: getMultiNames("cfg-decorations"),
      topping_ids: getMulti("cfg-toppings"),
      topping_names: getMultiNames("cfg-toppings"),
      primary_color:
        this.el.querySelector("#cfg-color-primary")?.value || "#F5E6D3",
      secondary_color:
        this.el.querySelector("#cfg-color-secondary")?.value || "#D4A574",
      accent_color:
        this.el.querySelector("#cfg-color-accent")?.value || "#E8A0BF",
      custom_message: this.el.querySelector("#cfg-message")?.value || "",
      message_font: this.el.querySelector("#cfg-font")?.value || "cursive",
      extra_notes: this.el.querySelector("#cfg-notes")?.value || "",
    };
  },

  async _generateAiImage() {
    if (!this.canvas) return;
    const genBtn = this.el.querySelector("#btn-generate-ai");
    const loader = this.el.querySelector("#cfg-ai-loading");
    const placeholder = this.el.querySelector("#canvas-placeholder");

    if (genBtn) genBtn.disabled = true;
    if (loader) loader.classList.remove("d-none");

    try {
      const config = this._gatherConfig();
      const result = await this._rpc("/configurador/generar-imagen", config);

      if (result.error && !result.image && !result.blank_canvas) {
        alert("Error: " + result.error);
        return;
      }

      this.designId = result.design_id;
      const designIdInput = this.el.querySelector("#cfg-design-id");
      if (designIdInput) designIdInput.value = result.design_id;

      if (result.use_product_image || result.blank_canvas) {
        // No AI configured — draw the premium procedural cake
        this._drawProceduralCake(config);
      } else if (result.image) {
        // AI-generated image — use it as background
        await this._setCanvasBackground(
          "data:image/png;base64," + result.image,
        );
      }

      // Show canvas (hide placeholder)
      if (result.image || result.use_product_image || result.blank_canvas) {
        if (placeholder) placeholder.style.display = "none";
        const canvasOuter = this.el.querySelector(".sc-cfg-canvas-container");
        if (canvasOuter) canvasOuter.classList.add("has-render");
        this._enableActions();
      }

      if (result.error) {
        console.warn("AI warning (using fallback):", result.error);
      }
    } catch (err) {
      console.error("Generate error:", err);
      // Fallback: use product image + overlay
      if (this.productImageUrl) {
        await this._setCanvasBackground(this.productImageUrl);
        this._addCustomizationOverlay(this._gatherConfig());
        const placeholder2 = this.el.querySelector("#canvas-placeholder");
        if (placeholder2) placeholder2.style.display = "none";
        this._enableActions();
      } else {
        alert("Error al generar la imagen. Intenta de nuevo.");
      }
    } finally {
      if (genBtn) genBtn.disabled = false;
      if (loader) loader.classList.add("d-none");
    }
  },

  _setCanvasBackground(imageUrl) {
    return new Promise((resolve) => {
      if (!this.canvas) return resolve();
      fabric.Image.fromURL(
        imageUrl,
        (img) => {
          if (!img) return resolve();
          // Scale image to fit canvas
          const scale = Math.min(
            this.canvas.width / img.width,
            this.canvas.height / img.height,
          );
          img.set({
            left: this.canvas.width / 2,
            top: this.canvas.height / 2,
            originX: "center",
            originY: "center",
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            _isBackground: true,
          });
          // Remove old background
          const objs = this.canvas.getObjects();
          objs.forEach((o) => {
            if (o._isBackground) this.canvas.remove(o);
          });
          this.canvas.insertAt(img, 0);
          this.canvas.renderAll();
          this._saveHistory();
          resolve();
        },
        { crossOrigin: "anonymous" },
      );
    });
  },

  // ════════════════════════════════════════════
  //  Premium Cake Rendering Engine
  //  Uses offscreen Canvas 2D for high-quality rendering,
  //  then loads result into Fabric.js as background.
  // ════════════════════════════════════════════

  /** Font map shared by all rendering functions */
  _fontMap: {
    cursive: "'Dancing Script', cursive",
    bold: "'Georgia', serif",
    handwritten: "'Caveat', cursive",
    modern: "'Montserrat', sans-serif",
  },

  /**
   * Parse any CSS color to hex. Handles hex, rgb(), named colors.
   */
  _parseColor(c) {
    if (!c) return "#d4a574";
    c = c.trim();
    if (c.startsWith("#")) return c;
    const m = c.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)/);
    if (m) {
      return (
        "#" +
        [m[1], m[2], m[3]]
          .map((x) => (+x).toString(16).padStart(2, "0"))
          .join("")
      );
    }
    return c;
  },

  /**
   * Render the premium cake to an offscreen canvas, return data URL.
   * Resolution: 1200×1200 for retina quality.
   */
  _renderPremiumCakeImage(config) {
    const S = 1200; // render size
    const cv = document.createElement("canvas");
    cv.width = S;
    cv.height = S;
    const ctx = cv.getContext("2d");

    const layers = parseInt(config.cake_layers) || 2;
    const shape = config.cake_shape || "round";
    const size = config.cake_size || "medium";
    const primary = this._parseColor(config.primary_color) || "#F5E6D3";
    const secondary = this._parseColor(config.secondary_color) || "#D4A574";
    const accent = this._parseColor(config.accent_color) || "#E8A0BF";
    const flavorColor = this._parseColor(config.flavor_color) || primary;
    const fillingColor = this._parseColor(config.filling_color) || "#f5e6d3";
    const frostingColor = this._parseColor(config.frosting_color) || secondary;
    const frostingName = (config.frosting_name || "").toLowerCase();
    const decoNames = (config.decoration_names || []).map((n) =>
      n.toLowerCase(),
    );
    const topNames = (config.topping_names || []).map((n) => n.toLowerCase());

    // Size multiplier
    const sizeMul =
      { small: 0.75, medium: 1.0, large: 1.15, xl: 1.3 }[size] || 1.0;

    // ── 1. Studio Background ──
    this._drawStudioBackground(ctx, S);

    // ── 2. Table / surface ──
    this._drawSurface(ctx, S);

    // ── 3. Plate ──
    const plateY = S * 0.82;
    this._drawPlate(ctx, S, plateY, sizeMul);

    // ── 4. Cake Body ──
    const maxCakeH = S * 0.5;
    const layerH = Math.min(maxCakeH / layers, S * 0.14);
    const baseW = S * 0.38 * sizeMul;
    const cakeBottom = plateY - S * 0.015;
    const taperFactor = 0.82;

    // Shadow under cake
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.beginPath();
    ctx.ellipse(S / 2, cakeBottom, baseW * 0.5, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (let i = 0; i < layers; i++) {
      const lw = baseW * Math.pow(taperFactor, i);
      const lh = layerH - S * 0.01;
      const lx = S / 2;
      const ly = cakeBottom - i * layerH;

      const isEven = i % 2 === 0;
      const layerColor = isEven
        ? flavorColor
        : this._lightenColor(flavorColor, 12);

      if (shape === "square") {
        this._drawSquareLayer(
          ctx,
          lx,
          ly,
          lw,
          lh,
          layerColor,
          frostingColor,
          frostingName,
          i,
        );
      } else if (shape === "heart" && i === layers - 1) {
        this._drawRoundLayerCanvas(
          ctx,
          lx,
          ly,
          lw,
          lh,
          layerColor,
          frostingColor,
          frostingName,
          i,
        );
        this._drawHeartTopper(ctx, lx, ly - lh, lw * 0.4, accent);
      } else {
        this._drawRoundLayerCanvas(
          ctx,
          lx,
          ly,
          lw,
          lh,
          layerColor,
          frostingColor,
          frostingName,
          i,
        );
      }

      // Filling line between layers
      if (i > 0) {
        const fillingY = cakeBottom - i * layerH + 2;
        const prevW = baseW * Math.pow(taperFactor, i - 1);
        ctx.save();
        ctx.fillStyle = fillingColor;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        if (shape === "square") {
          ctx.roundRect(lx - prevW * 0.5, fillingY - 3, prevW, 6, 2);
        } else {
          ctx.ellipse(lx, fillingY, prevW * 0.5, 4, 0, 0, Math.PI * 2);
        }
        ctx.fill();
        // Filling highlight
        ctx.fillStyle = this._lightenColor(fillingColor, 25);
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(lx, fillingY - 1, prevW * 0.35, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Drip effect
      const hasDrip = decoNames.some((n) => n.includes("drip"));
      if (hasDrip) {
        this._drawDrips(ctx, lx, ly - lh, lw, frostingColor, 12);
      }
    }

    // ── 5. Decorations ──
    const topY = cakeBottom - layers * layerH;
    const topW = baseW * Math.pow(taperFactor, layers - 1);

    // Flowers
    if (decoNames.some((n) => n.includes("flor"))) {
      this._drawPremiumFlowers(
        ctx,
        S / 2,
        topY + layerH * 0.3,
        topW,
        accent,
        layers,
      );
    }

    // Sprinkles
    if (decoNames.some((n) => n.includes("chispa") || n.includes("sprinkle"))) {
      this._drawSprinkles(
        ctx,
        S / 2,
        cakeBottom - (layers * layerH) / 2,
        baseW,
        layers * layerH,
        accent,
      );
    }

    // Gold leaf
    if (decoNames.some((n) => n.includes("oro") || n.includes("gold"))) {
      this._drawGoldLeaf(
        ctx,
        S / 2,
        cakeBottom - layers * layerH * 0.6,
        baseW * 0.7,
      );
    }

    // Macarons
    if (decoNames.some((n) => n.includes("macaron"))) {
      this._drawMacarons(
        ctx,
        S / 2,
        topY + layerH * 0.35,
        topW,
        accent,
        secondary,
      );
    }

    // Meringue kisses
    if (decoNames.some((n) => n.includes("merengue") || n.includes("beso"))) {
      this._drawMeringueKisses(ctx, S / 2, topY + layerH * 0.3, topW, accent);
    }

    // Ribbon/Cinta
    if (
      decoNames.some(
        (n) =>
          n.includes("cinta") || n.includes("lazo") || n.includes("ribbon"),
      )
    ) {
      this._drawRibbon(ctx, S / 2, cakeBottom - layerH * 0.5, baseW, accent);
    }

    // ── 6. Toppings ──
    // Strawberries
    if (topNames.some((n) => n.includes("fresa") || n.includes("strawberr"))) {
      this._drawStrawberries(ctx, S / 2, topY + layerH * 0.2, topW);
    }
    // Berries
    if (topNames.some((n) => n.includes("fruto") || n.includes("berr"))) {
      this._drawBerries(ctx, S / 2, topY + layerH * 0.2, topW);
    }
    // Chocolate shavings
    if (
      topNames.some(
        (n) =>
          n.includes("viruta") ||
          n.includes("chocolate") ||
          n.includes("shaving"),
      )
    ) {
      this._drawChocolateShavings(ctx, S / 2, topY + layerH * 0.15, topW);
    }
    // Caramel drizzle
    if (topNames.some((n) => n.includes("caramel"))) {
      this._drawCaramelDrizzle(ctx, S / 2, topY + layerH * 0.2, topW);
    }
    // Nuts
    if (
      topNames.some(
        (n) =>
          n.includes("nuez") || n.includes("almendra") || n.includes("nut"),
      )
    ) {
      this._drawNuts(ctx, S / 2, topY + layerH * 0.2, topW);
    }
    // Coconut flakes
    if (topNames.some((n) => n.includes("coco") || n.includes("coconut"))) {
      this._drawCoconutFlakes(ctx, S / 2, topY + layerH * 0.15, topW);
    }

    // ── 7. Message text ──
    if (config.custom_message) {
      this._drawPremiumMessage(
        ctx,
        config.custom_message,
        config.message_font,
        S / 2,
        cakeBottom - layers * layerH * 0.5,
        baseW * 0.7,
        secondary,
      );
    }

    // ── 8. Lighting pass ──
    this._drawLightingPass(ctx, S);

    return cv.toDataURL("image/png");
  },

  /**
   * Main entry: Draw procedural cake using the premium engine.
   */
  _drawProceduralCake(config) {
    if (!this.canvas) return;

    // Clear old procedural objects
    this.canvas
      .getObjects()
      .slice()
      .forEach((o) => {
        if (o._isProcedural || o._isBackground) this.canvas.remove(o);
      });

    const dataUrl = this._renderPremiumCakeImage(config);
    this._skipHistory = true;

    fabric.Image.fromURL(dataUrl, (img) => {
      if (!img) {
        this._skipHistory = false;
        return;
      }
      // Fill the Fabric canvas background to cover the transparency grid
      this.canvas.backgroundColor = "#f0e0ce";
      const scale = Math.min(
        this.canvas.width / img.width,
        this.canvas.height / img.height,
      );
      img.set({
        left: this.canvas.width / 2,
        top: this.canvas.height / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
        _isBackground: true,
        _isProcedural: true,
      });
      this.canvas.insertAt(img, 0);
      this.canvas.renderAll();
      this._skipHistory = false;
      this._saveHistory();
    });
  },

  // ── Studio Background ──
  _drawStudioBackground(ctx, S) {
    // Soft warm radial gradient
    const grad = ctx.createRadialGradient(
      S * 0.5,
      S * 0.35,
      S * 0.1,
      S * 0.5,
      S * 0.5,
      S * 0.85,
    );
    grad.addColorStop(0, "#fffcf7");
    grad.addColorStop(0.4, "#fdf6ee");
    grad.addColorStop(0.7, "#f8ece0");
    grad.addColorStop(1, "#f0e0ce");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, S, S);

    // Subtle bokeh circles
    ctx.save();
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 8; i++) {
      const bx = S * 0.1 + ((i * 137.5) % S) * 0.8;
      const by = S * 0.05 + ((i * 97.3) % (S * 0.4));
      const br = 20 + ((i * 31) % 50);
      const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      bg.addColorStop(0, "#fff");
      bg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // ── Surface / Table ──
  _drawSurface(ctx, S) {
    const surfY = S * 0.84;
    const grad = ctx.createLinearGradient(0, surfY, 0, S);
    grad.addColorStop(0, "#ede3d8");
    grad.addColorStop(0.1, "#e8ddd0");
    grad.addColorStop(1, "#dfd3c4");
    ctx.fillStyle = grad;
    ctx.fillRect(0, surfY, S, S - surfY);
    // Surface reflection line
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, surfY);
    ctx.lineTo(S, surfY);
    ctx.stroke();
  },

  // ── Plate ──
  _drawPlate(ctx, S, plateY, sizeMul) {
    const pw = S * 0.34 * sizeMul;
    // Plate shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.12)";
    ctx.shadowBlur = 25;
    ctx.shadowOffsetY = 8;
    // Outer rim
    ctx.fillStyle = "#f5f2ef";
    ctx.beginPath();
    ctx.ellipse(S / 2, plateY, pw, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Inner plate
    const grad = ctx.createRadialGradient(
      S / 2,
      plateY - 3,
      pw * 0.1,
      S / 2,
      plateY,
      pw,
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.6, "#faf8f5");
    grad.addColorStop(1, "#ece8e3");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(S / 2, plateY, pw - 8, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rim highlight
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(S / 2, plateY - 2, pw - 4, 14, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  },

  // ── Round Layer (Canvas 2D) ──
  _drawRoundLayerCanvas(
    ctx,
    cx,
    cy,
    w,
    h,
    layerColor,
    frostingColor,
    frostingName,
    layerIdx,
  ) {
    const isGanache = frostingName.includes("ganache");
    const isFondant = frostingName.includes("fondant");
    const isNaked =
      frostingName.includes("naked") || frostingName.includes("sin cobertura");

    // Side face (cylinder body)
    ctx.save();
    const sideGrad = ctx.createLinearGradient(cx - w * 0.5, 0, cx + w * 0.5, 0);
    const lightColor = this._lightenColor(
      isNaked ? layerColor : frostingColor,
      15,
    );
    const darkColor = this._darkenColor(
      isNaked ? layerColor : frostingColor,
      15,
    );
    sideGrad.addColorStop(0, darkColor);
    sideGrad.addColorStop(0.3, lightColor);
    sideGrad.addColorStop(0.5, isNaked ? layerColor : frostingColor);
    sideGrad.addColorStop(0.8, darkColor);
    sideGrad.addColorStop(
      1,
      this._darkenColor(isNaked ? layerColor : frostingColor, 25),
    );

    ctx.fillStyle = sideGrad;
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.5, cy - h, w, h, [w * 0.04, w * 0.04, 0, 0]);
    ctx.fill();

    // Ganache glossy highlight
    if (isGanache) {
      const glossGrad = ctx.createLinearGradient(
        cx - w * 0.3,
        cy - h,
        cx + w * 0.1,
        cy - h * 0.3,
      );
      glossGrad.addColorStop(0, "rgba(255,255,255,0)");
      glossGrad.addColorStop(0.4, "rgba(255,255,255,0.15)");
      glossGrad.addColorStop(0.6, "rgba(255,255,255,0.08)");
      glossGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glossGrad;
      ctx.beginPath();
      ctx.roundRect(cx - w * 0.5, cy - h, w, h, [w * 0.04, w * 0.04, 0, 0]);
      ctx.fill();
    }

    // Fondant smooth matte effect
    if (isFondant) {
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.roundRect(cx - w * 0.5, cy - h, w, h, [w * 0.04, w * 0.04, 0, 0]);
      ctx.fill();
    }

    // Bottom ellipse (base edge)
    ctx.fillStyle = this._darkenColor(isNaked ? layerColor : frostingColor, 8);
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.5, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // Top ellipse (3D perspective)
    const topGrad = ctx.createRadialGradient(
      cx - w * 0.1,
      cy - h - 2,
      w * 0.05,
      cx,
      cy - h,
      w * 0.5,
    );
    topGrad.addColorStop(0, this._lightenColor(frostingColor, 20));
    topGrad.addColorStop(0.5, frostingColor);
    topGrad.addColorStop(1, this._darkenColor(frostingColor, 12));
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h, w * 0.5, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Frosting edge line
    ctx.strokeStyle = this._lightenColor(frostingColor, 8);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - h, w * 0.5 + 3, h * 0.12 + 2, 0, Math.PI, Math.PI * 2);
    ctx.stroke();

    ctx.restore();

    // Naked cake: show sponge texture between frosting
    if (isNaked) {
      this._drawSpongeTexture(ctx, cx, cy, w, h, layerColor);
    }
  },

  // ── Square Layer ──
  _drawSquareLayer(
    ctx,
    cx,
    cy,
    w,
    h,
    layerColor,
    frostingColor,
    frostingName,
    layerIdx,
  ) {
    const isNaked =
      frostingName.includes("naked") || frostingName.includes("sin cobertura");
    const color = isNaked ? layerColor : frostingColor;

    ctx.save();
    // Front face
    const frontGrad = ctx.createLinearGradient(
      cx - w * 0.5,
      0,
      cx + w * 0.5,
      0,
    );
    frontGrad.addColorStop(0, this._darkenColor(color, 12));
    frontGrad.addColorStop(0.35, this._lightenColor(color, 10));
    frontGrad.addColorStop(0.65, color);
    frontGrad.addColorStop(1, this._darkenColor(color, 20));
    ctx.fillStyle = frontGrad;
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.5, cy - h, w, h, 6);
    ctx.fill();

    // Top face (isometric-ish perspective)
    const topGrad = ctx.createLinearGradient(0, cy - h - 15, 0, cy - h);
    topGrad.addColorStop(0, this._lightenColor(frostingColor, 18));
    topGrad.addColorStop(1, frostingColor);
    ctx.fillStyle = topGrad;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5, cy - h);
    ctx.lineTo(cx - w * 0.4, cy - h - 15);
    ctx.lineTo(cx + w * 0.5, cy - h - 15);
    ctx.lineTo(cx + w * 0.5, cy - h);
    ctx.closePath();
    ctx.fill();

    // Edge line
    ctx.strokeStyle = this._darkenColor(color, 15);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx - w * 0.5, cy - h, w, h, 6);
    ctx.stroke();

    ctx.restore();
  },

  // ── Sponge Texture (for naked cakes) ──
  _drawSpongeTexture(ctx, cx, cy, w, h, color) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    const dotColor = this._darkenColor(color, 20);
    for (let i = 0; i < 40; i++) {
      const dx = cx - w * 0.45 + ((i * 73) % (w * 0.9));
      const dy = cy - h * 0.9 + ((i * 47) % (h * 0.8));
      const dr = 1.5 + ((i * 13) % 3);
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(dx, dy, dr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  // ── Drip Effect (bezier curves) ──
  _drawDrips(ctx, cx, topY, width, color, count) {
    ctx.save();
    const dripColor = color;
    for (let d = 0; d < count; d++) {
      const dx = cx - width * 0.45 + (d / Math.max(count - 1, 1)) * width * 0.9;
      // Deterministic pseudo-random based on position
      const seed = (d * 73 + 37) % 100;
      const dripH = 25 + (seed % 45);
      const dripW = 7 + (seed % 6);

      ctx.fillStyle = dripColor;
      ctx.beginPath();
      ctx.moveTo(dx - dripW, topY);
      ctx.quadraticCurveTo(dx - dripW, topY + dripH * 0.7, dx, topY + dripH);
      ctx.quadraticCurveTo(dx + dripW, topY + dripH * 0.7, dx + dripW, topY);
      ctx.closePath();
      ctx.fill();

      // Drip highlight
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(
        dx - dripW * 0.3,
        topY + dripH * 0.3,
        dripW * 0.3,
        dripH * 0.2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    ctx.restore();
  },

  // ── Heart Topper ──
  _drawHeartTopper(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy + size * 0.3);
    ctx.bezierCurveTo(
      cx + size * 0.5,
      cy - size * 0.5,
      cx + size,
      cy - size * 0.2,
      cx,
      cy + size,
    );
    ctx.bezierCurveTo(
      cx - size,
      cy - size * 0.2,
      cx - size * 0.5,
      cy - size * 0.5,
      cx,
      cy + size * 0.3,
    );
    ctx.fill();

    // Heart highlight
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.ellipse(
      cx - size * 0.25,
      cy - size * 0.1,
      size * 0.15,
      size * 0.25,
      -0.3,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  },

  // ── Premium Flowers ──
  _drawPremiumFlowers(ctx, cx, cy, width, color, layers) {
    const count = Math.min(layers + 2, 7);
    for (let f = 0; f < count; f++) {
      const fx = cx + (f - (count - 1) / 2) * (width / (count + 1));
      const fy = cy + ((f * 17) % 10) - 5;
      const sz = 28 + ((f * 7) % 14);
      this._drawBezierRose(ctx, fx, fy, sz, color);
    }
  },

  _drawBezierRose(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowBlur = 6;
    // Outer petals
    const petalCount = 5;
    for (let p = 0; p < petalCount; p++) {
      const angle = (p / petalCount) * Math.PI * 2;
      const px = cx + Math.cos(angle) * size * 0.4;
      const py = cy + Math.sin(angle) * size * 0.4;
      ctx.fillStyle = this._lightenColor(color, 10 + p * 3);
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(px, py, size * 0.45, size * 0.3, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    // Inner petals (smaller, darker)
    ctx.shadowBlur = 0;
    for (let p = 0; p < 4; p++) {
      const angle = (p / 4) * Math.PI * 2 + 0.4;
      const px = cx + Math.cos(angle) * size * 0.15;
      const py = cy + Math.sin(angle) * size * 0.15;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.ellipse(px, py, size * 0.25, size * 0.18, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    // Center
    ctx.fillStyle = this._darkenColor(color, 20);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Center highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(cx - size * 0.03, cy - size * 0.03, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // ── Sprinkles ──
  _drawSprinkles(ctx, cx, cy, width, height, color) {
    ctx.save();
    const colors = [
      color,
      "#FF6B6B",
      "#4ECDC4",
      "#FFE66D",
      "#A8E6CF",
      "#FF8B94",
      "#FFDAC1",
    ];
    for (let i = 0; i < 60; i++) {
      const sx = cx - width * 0.4 + ((i * 73) % (width * 0.8));
      const sy = cy - height * 0.4 + ((i * 47) % (height * 0.8));
      const angle = (((i * 137) % 360) * Math.PI) / 180;
      const c = colors[i % colors.length];
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.8;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.roundRect(-5, -1.5, 10, 3, 1.5);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ── Gold Leaf ──
  _drawGoldLeaf(ctx, cx, cy, width) {
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const gx = cx - width * 0.4 + ((i * 97) % (width * 0.8));
      const gy = cy + ((i * 31) % 40) - 20;
      const gw = 25 + ((i * 13) % 25);
      const gh = 18 + ((i * 7) % 15);
      const angle = (((i * 47) % 180) * Math.PI) / 180;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(angle);
      // Gold foil irregular shape
      const goldGrad = ctx.createLinearGradient(
        -gw / 2,
        -gh / 2,
        gw / 2,
        gh / 2,
      );
      goldGrad.addColorStop(0, "#FFD700");
      goldGrad.addColorStop(0.3, "#FFF8DC");
      goldGrad.addColorStop(0.5, "#DAA520");
      goldGrad.addColorStop(0.7, "#FFD700");
      goldGrad.addColorStop(1, "#B8860B");
      ctx.fillStyle = goldGrad;
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(-gw * 0.3, -gh * 0.5);
      ctx.quadraticCurveTo(gw * 0.1, -gh * 0.6, gw * 0.4, -gh * 0.2);
      ctx.quadraticCurveTo(gw * 0.5, gh * 0.3, gw * 0.2, gh * 0.5);
      ctx.quadraticCurveTo(-gw * 0.2, gh * 0.4, -gw * 0.4, gh * 0.1);
      ctx.quadraticCurveTo(-gw * 0.5, -gh * 0.3, -gw * 0.3, -gh * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ── Macarons ──
  _drawMacarons(ctx, cx, cy, width, color1, color2) {
    const colors = [
      color1,
      color2,
      this._lightenColor(color1, 15),
      "#B5E8C3",
      "#FFD4E5",
    ];
    const count = 4;
    for (let i = 0; i < count; i++) {
      const mx = cx + (i - (count - 1) / 2) * (width / (count + 1));
      const my = cy + ((i * 11) % 8) - 4;
      const mc = colors[i % colors.length];
      const mr = 16;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // Top shell
      ctx.fillStyle = mc;
      ctx.beginPath();
      ctx.arc(mx, my - 4, mr, Math.PI, 0);
      ctx.fill();
      // Bottom shell
      ctx.fillStyle = this._darkenColor(mc, 8);
      ctx.beginPath();
      ctx.arc(mx, my + 4, mr, 0, Math.PI);
      ctx.fill();
      // Filling
      ctx.fillStyle = this._lightenColor(mc, 25);
      ctx.fillRect(mx - mr, my - 3, mr * 2, 6);
      // Feet (ruffled edge)
      ctx.fillStyle = this._darkenColor(mc, 5);
      ctx.beginPath();
      for (let t = 0; t < mr * 2; t += 3) {
        ctx.arc(mx - mr + t, my - 3, 1.5, 0, Math.PI * 2);
        ctx.arc(mx - mr + t, my + 3, 1.5, 0, Math.PI * 2);
      }
      ctx.fill();
      // Top highlight
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.ellipse(
        mx - mr * 0.2,
        my - mr * 0.4,
        mr * 0.4,
        mr * 0.2,
        -0.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      ctx.restore();
    }
  },

  // ── Meringue Kisses ──
  _drawMeringueKisses(ctx, cx, cy, width, color) {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const mx = cx + (i - (count - 1) / 2) * (width / (count + 1));
      const my = cy + ((i * 13) % 8) - 4;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.08)";
      ctx.shadowBlur = 4;
      // Swirl body
      const grad = ctx.createLinearGradient(mx - 8, my + 12, mx + 8, my - 12);
      grad.addColorStop(0, "#fff0f5");
      grad.addColorStop(0.5, "#ffffff");
      grad.addColorStop(1, this._lightenColor(color, 30));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(mx - 10, my + 8);
      ctx.quadraticCurveTo(mx - 12, my, mx - 6, my - 6);
      ctx.quadraticCurveTo(mx, my - 18, mx, my - 14);
      ctx.quadraticCurveTo(mx, my - 18, mx + 6, my - 6);
      ctx.quadraticCurveTo(mx + 12, my, mx + 10, my + 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },

  // ── Ribbon ──
  _drawRibbon(ctx, cx, cy, width, color) {
    ctx.save();
    const rw = width * 0.95;
    const rh = 18;

    ctx.shadowColor = "rgba(0,0,0,0.1)";
    ctx.shadowBlur = 6;

    // Ribbon band
    const ribbonGrad = ctx.createLinearGradient(
      cx - rw / 2,
      cy,
      cx + rw / 2,
      cy,
    );
    ribbonGrad.addColorStop(0, this._darkenColor(color, 10));
    ribbonGrad.addColorStop(0.2, color);
    ribbonGrad.addColorStop(0.5, this._lightenColor(color, 12));
    ribbonGrad.addColorStop(0.8, color);
    ribbonGrad.addColorStop(1, this._darkenColor(color, 10));
    ctx.fillStyle = ribbonGrad;
    ctx.beginPath();
    ctx.roundRect(cx - rw / 2, cy - rh / 2, rw, rh, 3);
    ctx.fill();

    // Bow center
    ctx.fillStyle = this._darkenColor(color, 15);
    ctx.beginPath();
    ctx.roundRect(cx - 8, cy - rh / 2 - 2, 16, rh + 4, 4);
    ctx.fill();

    // Bow loops
    const bowColor = this._lightenColor(color, 5);
    ctx.fillStyle = bowColor;
    // Left loop
    ctx.beginPath();
    ctx.ellipse(cx - 22, cy - 4, 18, 10, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // Right loop
    ctx.beginPath();
    ctx.ellipse(cx + 22, cy - 4, 18, 10, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Loop highlights
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx - 24, cy - 7, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 20, cy - 7, 8, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  // ── Strawberries ──
  _drawStrawberries(ctx, cx, cy, width) {
    const count = 4;
    for (let i = 0; i < count; i++) {
      const sx = cx + (i - (count - 1) / 2) * (width / (count + 0.5));
      const sy = cy + ((i * 7) % 6) - 3;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 5;
      // Berry body
      const grad = ctx.createRadialGradient(sx - 5, sy - 5, 3, sx, sy + 6, 22);
      grad.addColorStop(0, "#FF4444");
      grad.addColorStop(0.6, "#E33030");
      grad.addColorStop(1, "#B82020");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 16);
      ctx.quadraticCurveTo(sx + 20, sy - 6, sx + 16, sy + 10);
      ctx.quadraticCurveTo(sx + 10, sy + 24, sx, sy + 26);
      ctx.quadraticCurveTo(sx - 10, sy + 24, sx - 16, sy + 10);
      ctx.quadraticCurveTo(sx - 20, sy - 6, sx, sy - 16);
      ctx.fill();
      // Seeds
      ctx.fillStyle = "#FFDD44";
      ctx.globalAlpha = 0.6;
      for (let s = 0; s < 8; s++) {
        const seedX = sx - 8 + ((s * 23) % 16);
        const seedY = sy - 6 + ((s * 17) % 22);
        ctx.beginPath();
        ctx.ellipse(
          seedX,
          seedY,
          1.8,
          1.2,
          (s * 30 * Math.PI) / 180,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      // Leaf
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#2D8B2D";
      ctx.beginPath();
      ctx.moveTo(sx, sy - 16);
      ctx.quadraticCurveTo(sx - 10, sy - 26, sx - 5, sy - 17);
      ctx.moveTo(sx, sy - 16);
      ctx.quadraticCurveTo(sx + 10, sy - 26, sx + 5, sy - 17);
      ctx.fill();
      ctx.restore();
    }
  },

  // ── Berries (blueberries, raspberries) ──
  _drawBerries(ctx, cx, cy, width) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const bx = cx + (i - (count - 1) / 2) * (width / (count + 1));
      const by = cy + ((i * 11) % 8) - 4;
      const isBlue = i % 2 === 0;
      const baseColor = isBlue ? "#4A2FBD" : "#C41E3A";
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 3;
      const grad = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 7);
      grad.addColorStop(0, this._lightenColor(baseColor, 20));
      grad.addColorStop(0.7, baseColor);
      grad.addColorStop(1, this._darkenColor(baseColor, 20));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.ellipse(bx - 2, by - 3, 2.5, 1.8, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  },

  // ── Chocolate Shavings ──
  _drawChocolateShavings(ctx, cx, cy, width) {
    ctx.save();
    for (let i = 0; i < 18; i++) {
      const sx = cx - width * 0.4 + ((i * 67) % (width * 0.8));
      const sy = cy + ((i * 31) % 24) - 12;
      const angle = (((i * 53) % 180) * Math.PI) / 180;
      const shade =
        i % 3 === 0 ? "#2C1810" : i % 3 === 1 ? "#5C3D2E" : "#8B5E3C";
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.fillStyle = shade;
      ctx.globalAlpha = 0.85;
      // Curl shape (scaled up)
      ctx.beginPath();
      ctx.moveTo(-14, 3);
      ctx.quadraticCurveTo(-7, -10, 0, -7);
      ctx.quadraticCurveTo(7, -3, 14, -5);
      ctx.quadraticCurveTo(10, 5, 0, 3);
      ctx.quadraticCurveTo(-7, 2, -14, 3);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ── Caramel Drizzle ──
  _drawCaramelDrizzle(ctx, cx, cy, width) {
    ctx.save();
    ctx.strokeStyle = "#C8956C";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.globalAlpha = 0.7;
    // Flowing caramel lines
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const startX = cx - width * 0.3 + i * width * 0.3;
      ctx.moveTo(startX, cy - 5);
      ctx.bezierCurveTo(
        startX + 20,
        cy + 10,
        startX + 40,
        cy - 8,
        startX + 60,
        cy + 5,
      );
      ctx.stroke();
    }
    // Caramel highlight
    ctx.strokeStyle = "rgba(255,220,160,0.4)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const startX = cx - width * 0.3 + i * width * 0.3;
      ctx.moveTo(startX + 2, cy - 7);
      ctx.bezierCurveTo(
        startX + 22,
        cy + 8,
        startX + 42,
        cy - 10,
        startX + 62,
        cy + 3,
      );
      ctx.stroke();
    }
    ctx.restore();
  },

  // ── Nuts ──
  _drawNuts(ctx, cx, cy, width) {
    ctx.save();
    for (let i = 0; i < 10; i++) {
      const nx = cx - width * 0.3 + ((i * 67) % (width * 0.6));
      const ny = cy + ((i * 23) % 16) - 8;
      const angle = (((i * 47) % 180) * Math.PI) / 180;
      const shade = i % 2 === 0 ? "#A0785A" : "#C4A35A";
      ctx.save();
      ctx.translate(nx, ny);
      ctx.rotate(angle);
      ctx.shadowColor = "rgba(0,0,0,0.1)";
      ctx.shadowBlur = 3;
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Nut highlight
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath();
      ctx.ellipse(-1.5, -1.5, 2.5, 1.5, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ── Coconut Flakes ──
  _drawCoconutFlakes(ctx, cx, cy, width) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    for (let i = 0; i < 25; i++) {
      const fx = cx - width * 0.35 + ((i * 53) % (width * 0.7));
      const fy = cy + ((i * 37) % 25) - 12;
      const angle = (((i * 67) % 360) * Math.PI) / 180;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(angle);
      ctx.fillStyle =
        i % 3 === 0 ? "#FFFFF0" : i % 3 === 1 ? "#FFF8DC" : "#FEFEFE";
      ctx.beginPath();
      ctx.moveTo(-4, 0);
      ctx.quadraticCurveTo(0, -3, 4, 0);
      ctx.quadraticCurveTo(0, 2, -4, 0);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  // ── Premium Message Text ──
  _drawPremiumMessage(ctx, message, fontKey, cx, cy, maxWidth, bgColor) {
    const fontMap = {
      cursive: "italic 38px 'Dancing Script', cursive",
      bold: "bold 36px 'Georgia', serif",
      handwritten: "34px 'Caveat', cursive",
      modern: "600 32px 'Montserrat', sans-serif",
    };
    const font = fontMap[fontKey] || fontMap.cursive;

    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Measure text for banner
    const metrics = ctx.measureText(message);
    const tw = Math.min(metrics.width + 50, maxWidth + 40);
    const th = 52;

    // Semi-transparent banner behind text
    const bannerGrad = ctx.createLinearGradient(
      cx - tw / 2,
      cy,
      cx + tw / 2,
      cy,
    );
    bannerGrad.addColorStop(0, "rgba(255,255,255,0.75)");
    bannerGrad.addColorStop(0.5, "rgba(255,255,255,0.85)");
    bannerGrad.addColorStop(1, "rgba(255,255,255,0.75)");
    ctx.fillStyle = bannerGrad;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, cy - th / 2, tw, th, th / 2);
    ctx.fill();

    // Banner border
    ctx.strokeStyle = this._lightenColor(bgColor, 10) + "80";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, cy - th / 2, tw, th, th / 2);
    ctx.stroke();

    // Text shadow
    ctx.shadowColor = "rgba(0,0,0,0.15)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;

    // Text
    ctx.fillStyle = this._darkenColor(bgColor, 30);
    ctx.fillText(message, cx, cy + 2, maxWidth);
    ctx.restore();
  },

  // ── Lighting Pass ──
  _drawLightingPass(ctx, S) {
    // Top-left soft light
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    const lightGrad = ctx.createRadialGradient(
      S * 0.25,
      S * 0.15,
      0,
      S * 0.5,
      S * 0.5,
      S * 0.8,
    );
    lightGrad.addColorStop(0, "rgba(255,255,240,0.25)");
    lightGrad.addColorStop(0.5, "rgba(255,255,240,0.05)");
    lightGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = lightGrad;
    ctx.fillRect(0, 0, S, S);

    // Subtle vignette
    ctx.globalCompositeOperation = "multiply";
    const vignetteGrad = ctx.createRadialGradient(
      S * 0.5,
      S * 0.5,
      S * 0.35,
      S * 0.5,
      S * 0.5,
      S * 0.72,
    );
    vignetteGrad.addColorStop(0, "rgba(255,255,255,1)");
    vignetteGrad.addColorStop(1, "rgba(240,230,218,1)");
    ctx.fillStyle = vignetteGrad;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
  },

  // ════════════════════════════════════════════
  //  Customization Overlay (sobre imagen de producto)
  //  Premium glassmorphism design
  // ════════════════════════════════════════════

  _addCustomizationOverlay(config) {
    if (!this.canvas) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const accent = config.accent_color || "#E8A0BF";
    const secondary = config.secondary_color || "#D4A574";

    // Clear old overlays
    this.canvas
      .getObjects()
      .slice()
      .forEach((o) => {
        if (o._isOverlay) this.canvas.remove(o);
      });

    this._skipHistory = true;

    // ── Premium double border with glow ──
    const outerFrame = new fabric.Rect({
      left: W / 2,
      top: H / 2,
      originX: "center",
      originY: "center",
      width: W - 16,
      height: H - 16,
      fill: "transparent",
      stroke: accent,
      strokeWidth: 3.5,
      rx: 20,
      ry: 20,
      opacity: 0.5,
      shadow: new fabric.Shadow({ color: accent + "55", blur: 20 }),
      selectable: false,
      evented: false,
      _isOverlay: true,
    });
    this.canvas.add(outerFrame);

    const innerFrame = new fabric.Rect({
      left: W / 2,
      top: H / 2,
      originX: "center",
      originY: "center",
      width: W - 36,
      height: H - 36,
      fill: "transparent",
      stroke: this._lightenColor(accent, 20),
      strokeWidth: 1.5,
      rx: 14,
      ry: 14,
      opacity: 0.35,
      selectable: false,
      evented: false,
      _isOverlay: true,
    });
    this.canvas.add(innerFrame);

    // ── Corner floral ornaments (SVG paths instead of dots) ──
    const corners = [
      { x: 30, y: 30, rot: 0 },
      { x: W - 30, y: 30, rot: 90 },
      { x: 30, y: H - 30, rot: 270 },
      { x: W - 30, y: H - 30, rot: 180 },
    ];
    corners.forEach((c) => {
      // Decorative circles cluster
      [0, 1, 2].forEach((d) => {
        const offsets = [
          { x: 0, y: 0, r: 5 },
          { x: 8, y: 4, r: 3.5 },
          { x: 4, y: 9, r: 2.5 },
        ];
        const o = offsets[d];
        const dot = new fabric.Circle({
          left: c.x + (c.rot === 90 || c.rot === 180 ? -o.x : o.x),
          top: c.y + (c.rot === 180 || c.rot === 270 ? -o.y : o.y),
          originX: "center",
          originY: "center",
          radius: o.r,
          fill: accent,
          opacity: 0.55 - d * 0.12,
          shadow: new fabric.Shadow({ color: accent + "40", blur: 6 }),
          selectable: false,
          evented: false,
          _isOverlay: true,
        });
        this.canvas.add(dot);
      });
    });

    // ── Config summary badge (top) ──
    const shapeLabels = {
      round: "Redondo",
      square: "Cuadrado",
      heart: "Corazón",
    };
    const sizeLabels = {
      small: "Pequeño",
      medium: "Mediano",
      large: "Grande",
      xl: "Extra grande",
    };
    const parts = [];
    if (config.cake_shape)
      parts.push(shapeLabels[config.cake_shape] || config.cake_shape);
    if (config.cake_size)
      parts.push(sizeLabels[config.cake_size] || config.cake_size);
    if (config.cake_layers) parts.push(config.cake_layers + " pisos");
    if (config.flavor_name) parts.push(config.flavor_name);
    if (config.frosting_name) parts.push(config.frosting_name);

    if (parts.length) {
      const label = parts.join("  ·  ");
      const badgeW = Math.min(label.length * 8.5 + 40, W * 0.85);
      const badge = new fabric.Rect({
        left: W / 2,
        top: 32,
        originX: "center",
        originY: "center",
        width: badgeW,
        height: 34,
        rx: 17,
        ry: 17,
        fill: new fabric.Gradient({
          type: "linear",
          coords: { x1: 0, y1: 0, x2: badgeW, y2: 0 },
          colorStops: [
            { offset: 0, color: secondary + "DD" },
            { offset: 0.5, color: this._lightenColor(secondary, 10) + "CC" },
            { offset: 1, color: secondary + "DD" },
          ],
        }),
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.2)",
          blur: 10,
          offsetY: 3,
        }),
        selectable: false,
        evented: false,
        _isOverlay: true,
      });
      this.canvas.add(badge);

      const badgeText = new fabric.Text(label, {
        left: W / 2,
        top: 32,
        originX: "center",
        originY: "center",
        fontSize: 12.5,
        fontFamily: "Montserrat, sans-serif",
        fill: "#ffffff",
        fontWeight: "600",
        shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.3)", blur: 2 }),
        selectable: false,
        evented: false,
        _isOverlay: true,
      });
      this.canvas.add(badgeText);
    }

    // ── Decorations & Toppings mini-tags ──
    const allTags = [
      ...(config.decoration_names || []),
      ...(config.topping_names || []),
    ];
    if (allTags.length > 0) {
      const tagLabel = allTags.join("  ·  ");
      const tagW = Math.min(tagLabel.length * 7 + 30, W * 0.8);
      const tagBg = new fabric.Rect({
        left: W / 2,
        top: H - 58,
        originX: "center",
        originY: "center",
        width: tagW,
        height: 26,
        rx: 13,
        ry: 13,
        fill: accent + "AA",
        shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.15)", blur: 8 }),
        selectable: false,
        evented: false,
        _isOverlay: true,
      });
      this.canvas.add(tagBg);

      const tagText = new fabric.Text(tagLabel, {
        left: W / 2,
        top: H - 58,
        originX: "center",
        originY: "center",
        fontSize: 11,
        fontFamily: "Montserrat, sans-serif",
        fill: "#ffffff",
        fontWeight: "500",
        selectable: false,
        evented: false,
        _isOverlay: true,
      });
      this.canvas.add(tagText);
    }

    // ── Message banner (bottom) ──
    if (config.custom_message) {
      const bannerY = H - 30;
      const bannerW = Math.min(W * 0.8, 440);

      const banner = new fabric.Rect({
        left: W / 2,
        top: bannerY,
        originX: "center",
        originY: "center",
        width: bannerW,
        height: 48,
        rx: 24,
        ry: 24,
        fill: new fabric.Gradient({
          type: "linear",
          coords: { x1: 0, y1: 0, x2: bannerW, y2: 0 },
          colorStops: [
            { offset: 0, color: accent + "EE" },
            { offset: 0.5, color: this._lightenColor(accent, 8) + "DD" },
            { offset: 1, color: accent + "EE" },
          ],
        }),
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.25)",
          blur: 14,
          offsetY: 3,
        }),
        selectable: false,
        evented: false,
        _isOverlay: true,
      });
      this.canvas.add(banner);

      const fontMap = {
        cursive: "Dancing Script, cursive",
        bold: "Georgia, serif",
        handwritten: "Caveat, cursive",
        modern: "Montserrat, sans-serif",
      };
      const msgText = new fabric.IText(config.custom_message, {
        left: W / 2,
        top: bannerY,
        originX: "center",
        originY: "center",
        fontSize: Math.min(22, W * 0.04),
        fontFamily: fontMap[config.message_font] || "Dancing Script, cursive",
        fill: "#ffffff",
        fontWeight: "bold",
        fontStyle: "italic",
        textAlign: "center",
        shadow: new fabric.Shadow({ color: "rgba(0,0,0,0.5)", blur: 3 }),
        selectable: true,
        evented: true,
      });
      this.canvas.add(msgText);
    }

    this.canvas.renderAll();
    this._skipHistory = false;
    this._saveHistory();
  },

  // ════════════════════════════════════════════
  //  Color Utilities
  // ════════════════════════════════════════════

  _lightenColor(hex, percent) {
    hex = this._parseColor(hex);
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
    const g = Math.min(255, ((num >> 8) & 0x00ff) + Math.round(2.55 * percent));
    const b = Math.min(255, (num & 0x0000ff) + Math.round(2.55 * percent));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  _darkenColor(hex, percent) {
    hex = this._parseColor(hex);
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
    const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * percent));
    const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * percent));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  // ════════════════════════════════════════════
  //  Action Buttons
  // ════════════════════════════════════════════

  _enableActions() {
    const save = this.el.querySelector("#btn-save-design");
    const download = this.el.querySelector("#btn-download-design");
    const reserve = this.el.querySelector("#btn-add-to-reservation");
    if (save) save.disabled = false;
    if (download) download.disabled = false;
    if (reserve) reserve.classList.remove("d-none");
  },

  _bindActionButtons() {
    const saveBtn = this.el.querySelector("#btn-save-design");
    const dlBtn = this.el.querySelector("#btn-download-design");

    if (saveBtn) {
      saveBtn.addEventListener("click", () => this._saveDesign());
    }
    if (dlBtn) {
      dlBtn.addEventListener("click", () => this._downloadDesign());
    }
  },

  async _saveDesign() {
    if (!this.canvas || !this.designId) return;
    const saveBtn = this.el.querySelector("#btn-save-design");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML =
        '<i class="fa fa-spinner fa-spin me-2"></i>Guardando...';
    }

    try {
      const imageData = this.canvas.toDataURL({ format: "png", quality: 1 });
      const editorState = JSON.stringify(this.canvas.toJSON());

      const result = await this._rpc("/configurador/guardar-diseno", {
        design_id: this.designId,
        image_data: imageData,
        editor_state: editorState,
      });

      if (result.error) {
        alert("Error: " + result.error);
      } else {
        // Update reservation link
        const reserveBtn = this.el.querySelector("#btn-add-to-reservation");
        if (reserveBtn) {
          reserveBtn.href =
            "/reservar?design_id=" +
            this.designId +
            "&product_id=" +
            this.productId;
          reserveBtn.classList.remove("d-none");
        }
        // Show success
        if (saveBtn)
          saveBtn.innerHTML = '<i class="fa fa-check me-2"></i>¡Guardado!';
        setTimeout(() => {
          if (saveBtn) {
            saveBtn.innerHTML = '<i class="fa fa-save me-2"></i>Guardar Diseño';
            saveBtn.disabled = false;
          }
        }, 2000);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Error al guardar el diseño.");
      if (saveBtn) {
        saveBtn.innerHTML = '<i class="fa fa-save me-2"></i>Guardar Diseño';
        saveBtn.disabled = false;
      }
    }
  },

  _downloadDesign() {
    if (!this.canvas) return;
    const dataURL = this.canvas.toDataURL({ format: "png", quality: 1 });
    const link = document.createElement("a");
    link.download = "mi-diseno-sweet-cafe.png";
    link.href = dataURL;
    link.click();
  },

  // ════════════════════════════════════════════
  //  Load Existing Design
  // ════════════════════════════════════════════

  async _loadExistingDesign() {
    if (!this.designId || !this.canvas) return;
    try {
      const data = await this._rpc("/configurador/cargar-diseno", {
        design_id: parseInt(this.designId),
      });
      if (data.error) return;
      this._designLoaded = true;

      // Restore editor state if available
      if (data.editor_state) {
        const state =
          typeof data.editor_state === "string"
            ? data.editor_state
            : JSON.stringify(data.editor_state);
        this._skipHistory = true;
        this.canvas.loadFromJSON(state, () => {
          this.canvas.renderAll();
          this._skipHistory = false;
          this._saveHistory();
        });
        const placeholder = this.el.querySelector("#canvas-placeholder");
        if (placeholder) placeholder.style.display = "none";
        this._enableActions();
      } else if (data.ai_image) {
        await this._setCanvasBackground(
          "data:image/png;base64," + data.ai_image,
        );
        const placeholder2 = this.el.querySelector("#canvas-placeholder");
        if (placeholder2) placeholder2.style.display = "none";
        this._enableActions();
      }

      // Restore config panel selections
      this._restoreConfigPanel(data);
    } catch (err) {
      console.error("Load design error:", err);
    }
  },

  _restoreConfigPanel(data) {
    // Layers
    if (data.cake_layers) {
      this._selectButton("#cfg-layers", data.cake_layers);
    }
    // Shape
    if (data.cake_shape) {
      this._selectButton("#cfg-shape", data.cake_shape);
    }
    // Size
    if (data.cake_size) {
      const sizeEl = this.el.querySelector("#cfg-size");
      if (sizeEl) sizeEl.value = data.cake_size;
    }
    // Single selects
    ["flavor_id", "filling_id", "frosting_id"].forEach((field) => {
      if (data[field]) {
        const gridId = "#cfg-" + field.replace("_id", "");
        this._selectButton(gridId, String(data[field]));
      }
    });
    // Multi selects
    if (data.decoration_ids) {
      data.decoration_ids.forEach((id) => {
        this._selectButton("#cfg-decorations", String(id), true);
      });
    }
    if (data.topping_ids) {
      data.topping_ids.forEach((id) => {
        this._selectButton("#cfg-toppings", String(id), true);
      });
    }
    // Colors
    if (data.primary_color) {
      const el = this.el.querySelector("#cfg-color-primary");
      if (el) el.value = data.primary_color;
    }
    if (data.secondary_color) {
      const el = this.el.querySelector("#cfg-color-secondary");
      if (el) el.value = data.secondary_color;
    }
    if (data.accent_color) {
      const el = this.el.querySelector("#cfg-color-accent");
      if (el) el.value = data.accent_color;
    }
    // Message
    if (data.custom_message) {
      const el = this.el.querySelector("#cfg-message");
      if (el) el.value = data.custom_message;
    }
    if (data.message_font) {
      const el = this.el.querySelector("#cfg-font");
      if (el) el.value = data.message_font;
    }
    if (data.extra_notes) {
      const el = this.el.querySelector("#cfg-notes");
      if (el) el.value = data.extra_notes;
    }
  },

  _selectButton(containerSelector, value, multi) {
    const container = this.el.querySelector(containerSelector);
    if (!container) return;
    const btn = container.querySelector(`[data-value="${value}"]`);
    if (!btn) return;
    if (!multi) {
      container
        .querySelectorAll(".sc-cfg-btn, .sc-cfg-option-btn")
        .forEach((b) => b.classList.remove("active"));
    }
    btn.classList.add("active");
  },

  // ════════════════════════════════════════════
  //  Price Extras
  // ════════════════════════════════════════════

  _updateExtrasPrice() {
    let total = 0;
    this.el.querySelectorAll(".sc-cfg-option-btn.active").forEach((btn) => {
      const priceEl = btn.querySelector(".sc-cfg-option-price");
      if (priceEl) {
        const match = priceEl.textContent.match(/[\d.]+/);
        if (match) total += parseFloat(match[0]);
      }
    });
    const row = this.el.querySelector("#cfg-extras-price");
    const val = this.el.querySelector("#cfg-extras-value");
    if (row && val) {
      if (total > 0) {
        row.style.display = "";
        val.textContent = "+" + total.toFixed(0) + " CUP";
      } else {
        row.style.display = "none";
      }
    }
  },

  // ════════════════════════════════════════════
  //  RPC Helper
  // ════════════════════════════════════════════

  async _rpc(url, params) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: params || {},
      }),
    });
    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || JSON.stringify(data.error));
    }
    return data.result;
  },
});

export default publicWidget.registry.SweetConfigurator;
