import React, { useEffect, useRef } from 'react';
import dat from "dat-gui";
import Planet from './Planet'
import { get_camera_basis } from './Camera';
import { vertexShaderSource, fragmentShaderSource } from './shaders';

const { mat4, vec3 } = require('gl-matrix');

const WebGLCanvas = () => {
    const canvasRef = useRef(null);
    let animationFrameId = useRef(null);
    let previousTimestamp = useRef(0); // Store the previous timestamp
    let shaderProgram = null;
    let planets = [
        new Planet(10, 0, [1, 1, 0], 0, 10, 100, [
            new Planet(5, 19.6, [0, 1, 0], 0, 36, 200, [
                new Planet(1, 7, [1, 0, 1], Math.PI / 2, 1, 5)
            ]),
            new Planet(15, 45.6, [0, 1, 1], 0, 26, 10),
        ], true), //sun
    ];
    let gui = new dat.GUI();
    let world = {
        time_speed: 1,
        planet_subdivisions: 3,
        planet_draw: 'fill'
    }
    let camera = {
        perspective_fov: 1.5,
        position: {
            x: 0,
            y: 75,
            z: 0
        },
        rotation: {
            pitch: -Math.PI / 2, // тангаж (вверх вниз)
            yaw: 0, // рысканье (вправо влево)
            roll: 0 // крен
        },
        near: 0.1,
        far: 1000.0,
        torch_fov: 0.9
    }

    function setup_controls() {
        const step = 0.5
        document.addEventListener('keydown', function (event) {
            let [towards, right, up] = get_camera_basis(camera)
            vec3.scale(right, right, step)
            vec3.scale(towards, towards, step)
            if (event.code === 'KeyW') {
                camera.position.x += towards[0]
                camera.position.y += towards[1]
                camera.position.z += towards[2]
            }
            if (event.code === 'KeyA') {
                camera.position.x -= right[0]
                camera.position.y -= right[1]
                camera.position.z -= right[2]
            }
            if (event.code === 'KeyS') {
                camera.position.x -= towards[0]
                camera.position.y -= towards[1]
                camera.position.z -= towards[2]
            }
            if (event.code === 'KeyD') {
                camera.position.x += right[0]
                camera.position.y += right[1]
                camera.position.z += right[2]
            }

            if (event.code === 'ArrowLeft') {
                camera.rotation.yaw -= step
            }
            if (event.code === 'ArrowRight') {
                camera.rotation.yaw += step
            }
            if (event.code === 'ArrowUp') {
                camera.rotation.pitch += step
            }
            if (event.code === 'ArrowDown') {
                camera.rotation.pitch -= step
            }
            if (event.key === "e") {
                camera.rotation.roll += step
            }
            if (event.key === "q") {
                camera.rotation.roll -= step
            }

            if (event.shiftKey) {
                camera.position.y -= step
            }
            if (event.key === " ") {
                camera.position.y += step
            }
        });
    }

    function setup_gui() {
        gui.add(world, 'time_speed', 0, 10).listen()
        let planet_folder = gui.addFolder('Planet Settings')
        planet_folder.add(world, 'planet_subdivisions', 1, 5, 1.0)
        let camera_type = planet_folder.add(world, 'planet_draw', ['dots', 'fill', 'lines']);
        camera_type.setValue("fill");
        let camera_folder = gui.addFolder('Camera')
        camera_folder.add(camera, 'perspective_fov', 0.1, Math.PI * 0.8).listen();
        camera_folder.add(camera, 'near', 0.01, 10.0).listen();
        camera_folder.add(camera, 'far', 10.0, 1000.0).listen();
        camera_folder.add(camera, 'torch_fov', 0.05, 1.0).listen();
        let camera_translate_folder = camera_folder.addFolder('Translate')
        camera_translate_folder.add(camera.position, 'x', -100, 100, 0.1).listen();
        camera_translate_folder.add(camera.position, 'y', -100, 100, 0.1).listen();
        camera_translate_folder.add(camera.position, 'z', -100, 100, 0.1).listen();
        let camera_orientation_folder = camera_folder.addFolder('Orientation')
        camera_orientation_folder.add(camera.rotation, 'pitch', -Math.PI / 2, Math.PI / 2, 0.1).listen();
        camera_orientation_folder.add(camera.rotation, 'yaw', -Math.PI, Math.PI, 0.1).listen();
        camera_orientation_folder.add(camera.rotation, 'roll', -Math.PI / 2, Math.PI / 2, 0.1).listen();
    }

    function init(canvas, gl) {
        setup_gui()
        // Set the canvas size
        setup_controls()
        const dimension = [document.documentElement.clientWidth, document.documentElement.clientHeight];

        canvas.width = dimension[0];
        canvas.height = dimension[1];

        // Set clear color to black
        gl.clearColor(0, 0, 0, 1);
        gl.enable(gl.DEPTH_TEST)

        // Clear <canvas>
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        // // Create a buffer object to store circle data
        // const circleBuffer = gl.createBuffer();

        // Define the vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);

        // Define the fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);

        // Create a shader program and attach the shaders
        shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        gl.useProgram(shaderProgram);
    }

    function update(deltatime) {
        for (const planet of planets) {
            planet.update(deltatime)
        }
    }

    function draw(gl, camera) {
        for (const planet of planets) {
            planet.draw(gl, shaderProgram, camera, world)
        }
    }

    useEffect(() => {
        const canvas = canvasRef.current;
        const gl = canvas.getContext('webgl');

        // Check if WebGL is supported
        if (!gl) {
            console.error('WebGL is not supported');
            return;
        }
        init(canvas, gl);
        let deltaTime;
        let currentTime;
        for (const planet of planets) {
            planet.update(1)
        }
        // Function to update the canvas
        const updateCanvas = (timestamp) => {
            // Clear the canvas
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

            // gui.updateDisplay();
            // Draw circles
            currentTime = timestamp;
            deltaTime = (currentTime - previousTimestamp.current) / 1000; // Convert to seconds
            previousTimestamp.current = currentTime;

            update(deltaTime * world.time_speed)
            draw(gl, camera)

            // Request the next frame
            animationFrameId.current = requestAnimationFrame(updateCanvas);
        };

        // Start the update loop
        updateCanvas(0);

        // Cleanup function to cancel animation frame on component unmount
        return () => cancelAnimationFrame(animationFrameId.current);
    }, []);

    return <>
        <canvas ref={canvasRef} width={document.documentElement.clientWidth} height={document.documentElement.clientHeight} />
    </>;
};

export default WebGLCanvas;