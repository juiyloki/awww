interface Circle    { kind: "circle";    radius: number; }
interface Rectangle { kind: "rectangle"; width: number; height: number; }
interface Triangle  { kind: "triangle";  base: number; height: number; }
type Shape = Circle | Rectangle | Triangle;

function area(shape: Shape): number {
    switch (shape.kind) {
        case "circle":    return Math.PI * shape.radius ** 2;
        case "rectangle": return shape.width * shape.height;
        case "triangle":  return 0.5 * shape.base * shape.height;
    }
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
        el.setAttribute(k, String(v));
    }
    return el as SVGElement;
}

function renderShape(shape: Shape): SVGElement {
    switch (shape.kind) {
        case "circle":
            return svgEl("circle", { cx: 60, cy: 60, r: shape.radius, fill: "#FFB3BA" });
        case "rectangle":
            return svgEl("rect", {
                x: (120 - shape.width) / 2,
                y: (120 - shape.height) / 2,
                width: shape.width,
                height: shape.height,
                fill: "#E0BBE4",
            });
        case "triangle": {
            const cx = 60;
            const top = 60 - shape.height / 2;
            const bottom = 60 + shape.height / 2;
            const points = `${cx},${top} ${cx - shape.base / 2},${bottom} ${cx + shape.base / 2},${bottom}`;
            return svgEl("polygon", { points, fill: "#BAE1FF" });
        }
    }
}

export { Shape, Circle, Rectangle, Triangle, area, renderShape, svgEl };
