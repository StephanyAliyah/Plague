/**
 * Simple Gesture Recognizer for Garden Defense
 * Recognizes: 
 * -: Horizontal Line
 * |: Vertical Line
 * V: Wedge
 * ^: Inverted Wedge
 * Z: Zigzag
 * S: Square (represented as ☐)
 */

class GestureRecognizer {
    constructor() {
        this.reset();
        this.templates = this.initTemplates();
    }

    reset() {
        this.points = [];
    }

    addPoint(x, y) {
        this.points.push({ x, y });
    }

    recognize() {
        if (this.points.length < 10) return null;

        // 1. Preprocess
        const resampled = this.resample(this.points, 40);
        const normalized = this.normalize(resampled);

        // 2. Classify based on heuristics (simpler and more robust for these specific shapes)
        return this.classifyHeuristic(normalized, resampled);
    }

    resample(points, n) {
        const I = this.pathLength(points) / (n - 1);
        let D = 0;
        const newPoints = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const d = this.distance(points[i - 1], points[i]);
            if (D + d >= I) {
                const qx = points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
                const qy = points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
                const q = { x: qx, y: qy };
                newPoints.push(q);
                points.splice(i, 0, q);
                D = 0;
            } else {
                D += d;
            }
        }
        if (newPoints.length === n - 1) newPoints.push(points[points.length - 1]);
        return newPoints;
    }

    normalize(points) {
        // Bounding box
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const width = maxX - minX;
        const height = maxY - minY;
        const size = Math.max(width, height);

        return points.map(p => ({
            x: (p.x - minX) / size,
            y: (p.y - minY) / size
        }));
    }

    classifyHeuristic(normalized, raw) {
        const n = normalized.length;
        const start = normalized[0];
        const end = normalized[n - 1];
        
        // Calculate bounding box in normalized space
        let minX = 1, maxX = 0, minY = 1, maxY = 0;
        normalized.forEach(p => {
            minX = Math.min(minX, p.x);
            maxX = Math.max(maxX, p.x);
            minY = Math.min(minY, p.y);
            maxY = Math.max(maxY, p.y);
        });

        const w = maxX - minX;
        const h = maxY - minY;
        const aspect = w / h;

        // 1. Line Check (Horizontal or Vertical)
        if (aspect > 4 || aspect < 0.25) {
            if (aspect > 4) return "-";
            if (aspect < 0.25) return "|";
        }

        // 2. Square Check
        // A square should have points near the corners and a large central void, 
        // and start/end should be close.
        const distStartEnd = this.distance(start, end);
        if (distStartEnd < 0.3 && aspect > 0.6 && aspect < 1.4) {
            // Check if it's "square-ish"
            return "S"; // S for Square
        }

        // 3. Wedge (V and ^)
        // Find the "extremes"
        let peakY = minY;
        let valleyY = maxY;
        
        // V check: Y starts high, goes low (valley), ends high
        const midPoint = normalized[Math.floor(n/2)];
        if (start.y < 0.4 && end.y < 0.4 && midPoint.y > 0.7) {
            return "V";
        }
        // ^ check: Y starts low, goes high (peak), ends low
        if (start.y > 0.6 && end.y > 0.6 && midPoint.y < 0.3) {
            return "^";
        }

        // 4. Zigzag (Z)
        // Starts top-left, goes top-right, goes bottom-left, goes bottom-right
        if (start.x < 0.4 && start.y < 0.4 && end.x > 0.6 && end.y > 0.6) {
            // Check for direction changes
            let directionChanges = 0;
            for (let i = 2; i < n; i++) {
                const d1 = this.angle(normalized[i-2], normalized[i-1]);
                const d2 = this.angle(normalized[i-1], normalized[i]);
                if (Math.abs(d1 - d2) > Math.PI / 2) directionChanges++;
            }
            if (directionChanges >= 2) return "Z";
        }

        return null; // unrecognized
    }

    pathLength(points) {
        let d = 0;
        for (let i = 1; i < points.length; i++) {
            d += this.distance(points[i - 1], points[i]);
        }
        return d;
    }

    distance(p1, p2) {
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }

    angle(p1, p2) {
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
    }

    initTemplates() {
        return []; // Not used in heuristic approach
    }
}

window.GestureRecognizer = GestureRecognizer;
