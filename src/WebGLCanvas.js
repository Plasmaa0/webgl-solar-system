import React, { useEffect, useRef } from 'react';
import dat from "dat-gui";

const { mat4, vec3 } = require('gl-matrix');


// Create shader program
const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec3 aColor;
            
            uniform mat4 uModel;
            uniform mat4 uView;
            uniform mat4 uProjection;

            varying vec3 vColor;
          
            void main() {
                gl_Position = uProjection*uView*uModel*vec4(aPosition, 1.0);
                vColor = aColor;
            }
        `;
const fragmentShaderSource = `
            precision mediump float;

            varying vec3 vColor;

            void main() {
                gl_FragColor = vec4(vColor, 1.0);
            }
        `;

const get_camera_basis = (camera) => {
    const towardsVec = vec3.fromValues(
        Math.cos(camera.rotation.yaw) * Math.cos(camera.rotation.pitch),
        Math.sin(camera.rotation.pitch),
        Math.sin(camera.rotation.yaw) * Math.cos(camera.rotation.pitch)
    )
    const upVec = vec3.fromValues(0, 1, 0); // Define the up direction (typically [0, 1, 0])
    const rightVec = vec3.cross(vec3.create(), towardsVec, upVec);
    const UpVec_no_roll = vec3.cross(vec3.create(), rightVec, towardsVec);

    const rotationMatrix = mat4.create();
    mat4.fromRotation(rotationMatrix, camera.rotation.roll, towardsVec);

    const newUpVec = vec3.transformMat4(vec3.create(), UpVec_no_roll, rotationMatrix);

    const normalized_UP = vec3.normalize(vec3.create(), newUpVec);
    const normalized_RIGHT = vec3.normalize(vec3.create(), rightVec);
    const normalized_TOWARDS = vec3.normalize(vec3.create(), towardsVec);

    return [normalized_TOWARDS, normalized_RIGHT, normalized_UP]

}
const getProjectionMatrix = (gl, camera) => {
    let projection = mat4.create()
    mat4.identity(projection);
    console.log(gl.drawingBufferWidth, gl.drawingBufferHeight)
    return mat4.perspective(projection, camera.perspective_fov, gl.drawingBufferWidth / gl.drawingBufferHeight, camera.near, camera.far)
}

const getViewMatrix = (camera) => {
    let u_view_matrix = mat4.create();
    const [towards, right, up] = get_camera_basis(camera)
    mat4.lookAt(u_view_matrix,
        [camera.position.x, camera.position.y, camera.position.z],
        [
            camera.position.x + towards[0],
            camera.position.y + towards[1],
            camera.position.z + towards[2]
        ],
        up)
    return u_view_matrix
}

class Planet {
    constructor(size, radius, color, inclination, x, y, z, orbitPeriod, centerX, centerY, centerZ) {
        this.size = size;
        this.radius = radius;
        this.color = color;
        this.inclination = inclination;
        this.x = x;
        this.y = y;
        this.z = z;
        this.orbitPeriod = orbitPeriod;
        this.centerX = centerX;
        this.centerY = centerY;
        this.centerZ = centerZ;
        this.currentAngle = 0;
    }

    update(deltaTime) {
        const angleIncrement = (Math.PI * 2) / this.orbitPeriod * deltaTime;
        this.currentAngle += angleIncrement;

        this.x = this.centerX + Math.cos(this.currentAngle) * this.radius;
        this.y = this.centerY + Math.sin(this.currentAngle) * Math.sin(this.inclination) * this.radius;
        this.z = this.centerZ + Math.sin(this.currentAngle) * Math.cos(this.inclination) * this.radius;
    }

    draw(gl, shaderProgram, camera) {
        // Create vertex buffer
        const vertices = this.generateSphereVertices();
        // const vertices = [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0];
        this.verticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        // Create color buffer
        const colors = this.generateColors(vertices.length / 3);
        // const colors = [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0];
        this.colorsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

        // Bind vertex attributes
        const positionAttributeLocation = gl.getAttribLocation(shaderProgram, "aPosition");
        const colorAttributeLocation = gl.getAttribLocation(shaderProgram, "aColor");

        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(positionAttributeLocation);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorsBuffer);
        gl.vertexAttribPointer(colorAttributeLocation, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(colorAttributeLocation);

        const modelMatrix = mat4.create();

        mat4.translate(modelMatrix, modelMatrix, [this.x, this.y, this.z]);
        const modelUniformLocation = gl.getUniformLocation(shaderProgram, "uModel");
        gl.uniformMatrix4fv(modelUniformLocation, false, modelMatrix);
        // Set uniform value
        // const translationUniformLocation = gl.getUniformLocation(shaderProgram, "uTranslation");
        // gl.uniform3f(translationUniformLocation, this.x, this.y, this.z);

        const aViewLocation = gl.getUniformLocation(shaderProgram, "uView");
        const aProjectionLocation = gl.getUniformLocation(shaderProgram, "uProjection");

        // Pass the view and projection matrices to the shader
        gl.uniformMatrix4fv(aViewLocation, false, getViewMatrix(camera));
        gl.uniformMatrix4fv(aProjectionLocation, false, getProjectionMatrix(gl, camera));
        // Draw planet
        gl.drawArrays(gl.POINTS, 0, vertices.length / 3);
    }

    generateSphereVertices() {
        const latitudeBands = 64;
        const longitudeBands = 64;

        const vertices = [];

        for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
            const theta = (latNumber * Math.PI) / latitudeBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
                const phi = (longNumber * 2 * Math.PI) / longitudeBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                vertices.push(x * this.size);
                vertices.push(y * this.size);
                vertices.push(z * this.size);
            }
        }

        return vertices;
    }

    generateColors(numVertices) {
        const colors = [];
        for (let i = 0; i < numVertices; i++) {
            colors.push(this.color[0]);
            colors.push(this.color[1]);
            colors.push(this.color[2]);
        }
        return colors;
    }
}
const WebGLCanvas = ({ width, height }) => {
    const canvasRef = useRef(null);
    let animationFrameId = useRef(null);
    let previousTimestamp = useRef(0); // Store the previous timestamp
    let shaderProgram = null;
    let planets = [
        new Planet(10, 0, [1, 1, 0], 0, 0, 0, 0, 10, 0, 0, 0), //sun
        new Planet(5, 19.6, [0, 1, 0], 0, 0, 0, 0, 36, 0, 0, 0),
        new Planet(5, 149.6, [0, 1, 1], 0, 0, 0, 0, 26, 0, 0, 0),
    ];
    let gui = new dat.GUI();

    let camera = {
        perspective_fov: 1.5,
        position: {
            x: 0,
            y: 0,
            z: 0
        },
        rotation: {
            pitch: 0, // тангаж (вверх вниз)
            yaw: 0, // рысканье (вправо влево)
            roll: 0 // крен
        },
        near: 0.1,
        far: 1000.0
    }

    function setup_controls() {
        const step = 0.1
        document.addEventListener('keydown', function (event) {
            let [towards, right, up] = get_camera_basis(camera)
            vec3.scale(right, right, step)
            vec3.scale(towards, towards, step)
            if (event.code == 'KeyW') {
                camera.position.x += towards[0]
                camera.position.y += towards[1]
                camera.position.z += towards[2]
            }
            if (event.code == 'KeyA') {
                camera.position.x -= right[0]
                camera.position.y -= right[1]
                camera.position.z -= right[2]
            }
            if (event.code == 'KeyS') {
                camera.position.x -= towards[0]
                camera.position.y -= towards[1]
                camera.position.z -= towards[2]
            }
            if (event.code == 'KeyD') {
                camera.position.x += right[0]
                camera.position.y += right[1]
                camera.position.z += right[2]
            }

            if (event.code == 'ArrowLeft') {
                camera.rotation.yaw -= step
            }
            if (event.code == 'ArrowRight') {
                camera.rotation.yaw += step
            }
            if (event.code == 'ArrowUp') {
                camera.rotation.pitch += step
            }
            if (event.code == 'ArrowDown') {
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
            // gui.updateDisplay();
        });
    }

    function setup_gui() {
        let camera_folder = gui.addFolder('Camera')
        camera_folder.add(camera, 'perspective_fov', 0.1, Math.PI * 0.8);
        camera_folder.add(camera, 'near', 0.01, 10.0)
        camera_folder.add(camera, 'far', 10.0, 1000.0)
        let camera_translate_folder = camera_folder.addFolder('Translate')
        camera_translate_folder.add(camera.position, 'x', -5, 5, 0.1)
        camera_translate_folder.add(camera.position, 'y', -5, 5, 0.1)
        camera_translate_folder.add(camera.position, 'z', -5, 5, 0.1)
        let camera_orientation_folder = camera_folder.addFolder('Orientation')
        camera_orientation_folder.add(camera.rotation, 'pitch', -Math.PI / 2, Math.PI / 2, 0.1)
        camera_orientation_folder.add(camera.rotation, 'yaw', -Math.PI, Math.PI, 0.1)
        camera_orientation_folder.add(camera.rotation, 'roll', -Math.PI / 2, Math.PI / 2, 0.1)
    }

    function init(canvas, gl) {
        setup_gui()
        // Set the canvas size
        setup_controls()
        const dimension = [document.documentElement.clientWidth, document.documentElement.clientHeight];

        canvas.width = dimension[0] * 0.9;
        canvas.height = dimension[1] * 0.9;

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
            planet.draw(gl, shaderProgram, camera)
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

            // Draw circles
            currentTime = timestamp;
            deltaTime = (currentTime - previousTimestamp.current) / 1000; // Convert to seconds
            previousTimestamp.current = currentTime;

            update(deltaTime)
            draw(gl, camera)

            // Request the next frame
            animationFrameId.current = requestAnimationFrame(updateCanvas);
        };

        // Start the update loop
        updateCanvas(0);

        // Cleanup function to cancel animation frame on component unmount
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [width, height]);

    return <>
        <canvas ref={canvasRef} />
    </>;
};

export default WebGLCanvas;