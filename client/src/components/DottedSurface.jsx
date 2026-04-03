import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Animated 3-D particle wave background.
 *
 * Key design decisions:
 *  - camera.lookAt(0,0,0): without this the camera stares at the horizon
 *    above the grid so the Y-wave looks like imperceptible depth shimmer.
 *    Pointing at the origin tilts it down ~16° and makes the ripple obvious.
 *  - DynamicDrawUsage: hints the GPU this position buffer is re-uploaded
 *    every frame, which prevents stale-buffer artefacts on some drivers.
 *  - Float32Array built directly: avoids the JS→TypedArray conversion that
 *    THREE.Float32BufferAttribute does internally, giving us the exact
 *    reference we mutate in the loop.
 *  - running flag: React 18 StrictMode fires setup→cleanup→setup in dev.
 *    The flag ensures the first loop stops before the second one starts,
 *    preventing a double-RAF that fights over the same geometry.
 *  - Colors in 0-1 range: THREE vertex colors are normalised floats,
 *    not 0-255 integers.
 */
export default function DottedSurface({ className = "", opacity = 0.85, ...props }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SEPARATION = 150;
    const AMOUNTX    = 40;
    const AMOUNTY    = 60;
    const N          = AMOUNTX * AMOUNTY;

    // ── Scene ──────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 5000, 10000);

    // ── Camera ─────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 1, 10000,
    );
    camera.position.set(0, 355, 1220);
    camera.lookAt(0, 0, 0); // ← THE fix: tilt down to face the wave

    // ── Renderer ───────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = "block"; // kill inline-gap
    container.appendChild(renderer.domElement);

    // ── Geometry (pre-allocated Float32Arrays) ─────────────────────
    const posArr = new Float32Array(N * 3);
    const colArr = new Float32Array(N * 3);

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        const i = ix * AMOUNTY + iy;
        posArr[i * 3 + 0] = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
        posArr[i * 3 + 1] = 0;
        posArr[i * 3 + 2] = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;
        // Bright blue-white in 0-1 range ≈ rgb(200, 215, 240)
        colArr[i * 3 + 0] = 0.78;
        colArr[i * 3 + 1] = 0.84;
        colArr[i * 3 + 2] = 0.94;
      }
    }

    const geometry = new THREE.BufferGeometry();

    const posAttr = new THREE.BufferAttribute(posArr, 3);
    posAttr.setUsage(THREE.DynamicDrawUsage); // re-uploaded every frame
    geometry.setAttribute("position", posAttr);
    geometry.setAttribute("color", new THREE.BufferAttribute(colArr, 3));

    const material = new THREE.PointsMaterial({
      size: 7,
      vertexColors: true,
      transparent: true,
      opacity,
      sizeAttenuation: true,
    });

    scene.add(new THREE.Points(geometry, material));

    // ── Animation loop ─────────────────────────────────────────────
    let count   = 0;
    let rafId;
    let running = true; // guard against StrictMode double-mount

    function animate() {
      if (!running) return;
      rafId = requestAnimationFrame(animate);

      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const i = ix * AMOUNTY + iy;
          posArr[i * 3 + 1] =
            Math.sin((ix + count) * 0.3) * 50 +
            Math.sin((iy + count) * 0.5) * 50;
        }
      }

      posAttr.needsUpdate = true; // flag the exact attribute
      renderer.render(scene, camera);
      count += 0.1;
    }

    animate();

    // ── Resize ─────────────────────────────────────────────────────
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener("resize", onResize);

    // ── Cleanup ────────────────────────────────────────────────────
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [opacity]);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
      {...props}
    />
  );
}
