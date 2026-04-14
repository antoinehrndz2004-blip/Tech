import { useEffect, useRef } from "react";
import * as THREE from "three";

export type SceneVariant = "dashboard" | "upload" | "reports" | "settings";

interface AnimMesh {
  mesh: THREE.Object3D;
  ry?: number;
  rx?: number;
  orbit?: {
    radius: number;
    speed: number;
    phase: number;
    tilt: number;
  };
  scan?: boolean;
  floatPhase?: number;
}

/**
 * Animated WebGL scene used as decorative headers. One variant per page, all
 * rendered off the same geometry/material primitives to keep the bundle lean.
 */
export function ThreeScene({ variant = "dashboard" }: { variant?: SceneVariant }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const width = el.clientWidth;
    const height = el.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const l1 = new THREE.PointLight(0xd4a853, 2, 20);
    l1.position.set(3, 3, 3);
    scene.add(l1);
    const l2 = new THREE.PointLight(0x3b82f6, 1.5, 20);
    l2.position.set(-3, -2, 2);
    scene.add(l2);
    const l3 = new THREE.PointLight(0x34d399, 1, 15);
    l3.position.set(0, 3, -2);
    scene.add(l3);

    const meshes: AnimMesh[] = [];
    const disposables: Array<{ dispose: () => void }> = [];

    const track = <T extends THREE.BufferGeometry | THREE.Material>(x: T): T => {
      disposables.push(x);
      return x;
    };

    if (variant === "dashboard") {
      const icoGeo = track(new THREE.IcosahedronGeometry(1.3, 0));
      const icoMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0xd4a853,
          metalness: 0.9,
          roughness: 0.1,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        }),
      );
      const ico = new THREE.Mesh(icoGeo, icoMat);
      scene.add(ico);
      meshes.push({ mesh: ico, ry: 0.003, rx: 0.002 });

      const wireGeo = track(new THREE.IcosahedronGeometry(1.6, 1));
      const wireMat = track(
        new THREE.MeshBasicMaterial({
          color: 0xd4a853,
          wireframe: true,
          transparent: true,
          opacity: 0.12,
        }),
      );
      const wire = new THREE.Mesh(wireGeo, wireMat);
      scene.add(wire);
      meshes.push({ mesh: wire, ry: -0.002, rx: 0.001 });

      const colors = [0xd4a853, 0x34d399, 0x3b82f6, 0xa78bfa, 0xf43f5e];
      for (let i = 0; i < colors.length; i++) {
        const sphereGeo = track(new THREE.SphereGeometry(0.06, 16, 16));
        const sphereMat = track(
          new THREE.MeshPhysicalMaterial({
            color: colors[i],
            metalness: 1,
            roughness: 0.2,
            emissive: colors[i],
            emissiveIntensity: 0.5,
          }),
        );
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        scene.add(sphere);
        meshes.push({
          mesh: sphere,
          orbit: {
            radius: 2.2 + i * 0.15,
            speed: 0.008 + i * 0.003,
            phase: (i * Math.PI * 2) / 5,
            tilt: 0.3 + i * 0.2,
          },
        });
      }
    } else if (variant === "upload") {
      const boxGeo = track(new THREE.BoxGeometry(1.2, 1.6, 0.08));
      const boxMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0.1,
          roughness: 0.05,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
        }),
      );
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.rotation.x = 0.2;
      box.rotation.y = -0.3;
      scene.add(box);
      meshes.push({ mesh: box, ry: 0.005 });

      const lineGeo = track(new THREE.BoxGeometry(1.1, 0.02, 0.01));
      const lineMat = track(
        new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.8 }),
      );
      const line = new THREE.Mesh(lineGeo, lineMat);
      box.add(line);
      meshes.push({ mesh: line, scan: true });

      const edgesGeo = track(new THREE.EdgesGeometry(boxGeo));
      const edgesMat = track(
        new THREE.LineBasicMaterial({ color: 0xd4a853, transparent: true, opacity: 0.3 }),
      );
      box.add(new THREE.LineSegments(edgesGeo, edgesMat));
    } else if (variant === "reports") {
      const barColors = [0xd4a853, 0x34d399, 0x3b82f6, 0xa78bfa, 0xf43f5e, 0xfbbf24];
      for (let j = 0; j < barColors.length; j++) {
        const h = 0.3 + Math.random() * 1.2;
        const barGeo = track(new THREE.BoxGeometry(0.25, h, 0.25));
        const barMat = track(
          new THREE.MeshPhysicalMaterial({
            color: barColors[j],
            metalness: 0.8,
            roughness: 0.15,
            transparent: true,
            opacity: 0.5,
          }),
        );
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(-1.2 + j * 0.5, h / 2 - 0.5, 0);
        scene.add(bar);
        meshes.push({ mesh: bar, floatPhase: j * 0.5 });
      }
      const floorGeo = track(new THREE.BoxGeometry(3.5, 0.02, 1));
      const floorMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0xd4a853,
          metalness: 0.9,
          roughness: 0.1,
          transparent: true,
          opacity: 0.1,
        }),
      );
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.y = -0.5;
      scene.add(floor);
      camera.position.set(1, 1.5, 4);
      camera.lookAt(0, 0, 0);
    } else {
      const t1Geo = track(new THREE.TorusGeometry(1, 0.15, 8, 6));
      const torusMat = track(
        new THREE.MeshPhysicalMaterial({
          color: 0xd4a853,
          metalness: 0.9,
          roughness: 0.1,
          transparent: true,
          opacity: 0.3,
        }),
      );
      const t1 = new THREE.Mesh(t1Geo, torusMat);
      scene.add(t1);
      meshes.push({ mesh: t1, ry: 0.005, rx: 0.002 });

      const t2Geo = track(new THREE.TorusGeometry(0.5, 0.1, 8, 6));
      const t2 = new THREE.Mesh(t2Geo, torusMat);
      scene.add(t2);
      meshes.push({ mesh: t2, ry: -0.008, rx: -0.003 });
    }

    let time = 0;
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      time += 0.016;
      meshes.forEach((x) => {
        if (x.orbit) {
          const { radius, speed, phase, tilt } = x.orbit;
          x.mesh.position.x = Math.cos(time * speed * 60 + phase) * radius;
          x.mesh.position.y =
            Math.sin(time * speed * 60 + phase) * radius * Math.sin(tilt);
          x.mesh.position.z =
            Math.sin(time * speed * 60 + phase) * radius * Math.cos(tilt) * 0.3;
        } else if (x.scan) {
          x.mesh.position.y = Math.sin(time * 1.5) * 0.7;
          const m = x.mesh as THREE.Mesh;
          const mat = m.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.5 + Math.sin(time * 3) * 0.3;
        } else {
          if (x.ry) x.mesh.rotation.y += x.ry;
          if (x.rx) x.mesh.rotation.x += x.rx;
          x.mesh.position.y += Math.sin(time * 1.2 + (x.floatPhase ?? 0)) * 0.001;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [variant]);

  return (
    <div
      ref={ref}
      style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
    />
  );
}
