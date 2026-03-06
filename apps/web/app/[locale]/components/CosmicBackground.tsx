"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function CosmicBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const w = window.innerWidth;
    const h = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020208, 0.00015);

    const camera = new THREE.PerspectiveCamera(60, w / h, 1, 8000);
    camera.position.z = 1200;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x020208, 1);
    container.appendChild(renderer.domElement);

    function createCircleTexture(size: number, coreRatio: number) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const half = size / 2;
      const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(coreRatio, "rgba(255,255,255,0.8)");
      grad.addColorStop(coreRatio * 3, "rgba(255,255,255,0.2)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(canvas);
    }

    const starTex = createCircleTexture(64, 0.1);

    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    const starCount = isMobile ? 3000 : 8000;

    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 5000;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 5000;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 5000;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 12,
      map: starTex,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const driftSpeed = 16;
    let frame = 0;
    let lastTime = performance.now();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      camera.position.x += (mx * 25 - camera.position.x) * 0.015;
      camera.position.y += (-my * 15 - camera.position.y) * 0.015;
      camera.lookAt(0, 0, 0);

      const starPositions = starGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < starCount; i++) {
        starPositions[i * 3 + 2] += driftSpeed * delta;
        if (starPositions[i * 3 + 2] > 2500) {
          starPositions[i * 3 + 2] = -2500;
          starPositions[i * 3] = (Math.random() - 0.5) * 5000;
          starPositions[i * 3 + 1] = (Math.random() - 0.5) * 5000;
        }
      }
      starGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      starGeo.dispose();
      starMat.dispose();
      starTex.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
