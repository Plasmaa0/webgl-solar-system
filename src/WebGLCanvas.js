import React, {useEffect, useRef} from 'react';
import dat from "dat-gui";

const {mat4, vec3} = require('gl-matrix');


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

class Camera {
    constructor(x, y, z, rotX, rotY, rotZ, pov, aspectRatio) {
        this.position = vec3.fromValues(x, y, z);
        this.pov = pov;
        this.aspectRatio = aspectRatio;
        this.rotation = vec3.fromValues(rotX, rotY, rotZ);
    }

    setX(x) {
        this.position[0] = x
    }

    setY(y) {
        this.position[1] = y
    }

    setZ(z) {
        this.position[2] = z
    }

    setRotX(x) {
        this.rotation[0] = x
    }

    setRotY(y) {
        this.rotation[1] = y
    }

    setRotZ(z) {
        this.rotation[2] = z
    }

    getViewMatrix() {
        const viewMatrix = mat4.create();

        // Apply camera rotation
        mat4.rotateX(viewMatrix, viewMatrix, this.rotation[0]);
        mat4.rotateY(viewMatrix, viewMatrix, this.rotation[1]);
        mat4.rotateZ(viewMatrix, viewMatrix, this.rotation[2]);

        // Apply camera translation
        const negatedPosition = vec3.create();
        vec3.negate(negatedPosition, this.position);
        mat4.translate(viewMatrix, viewMatrix, negatedPosition);

        return viewMatrix;
    }

    getProjectionMatrix() {
        const projectionMatrix = mat4.create();

        mat4.perspective(projectionMatrix, this.pov, this.aspectRatio, 0.1, 1000.0);

        return projectionMatrix;
    }
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
        gl.uniformMatrix4fv(aViewLocation, false, camera.getViewMatrix());
        gl.uniformMatrix4fv(aProjectionLocation, false, camera.getProjectionMatrix());
        // Draw planet
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 3);
    }

    generateSphereVertices() {
        const latitudeBands = 32;
        const longitudeBands = 32;

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

const WebGLCanvas = ({width, height}) => {
    const canvasRef = useRef(null);
    let animationFrameId = useRef(null);
    let previousTimestamp = useRef(0); // Store the previous timestamp
    let shaderProgram = null;
    const cameraPositionXSliderRef = useRef(null);
    const cameraPositionYSliderRef = useRef(null);
    const cameraPositionZSliderRef = useRef(null);
    const cameraRotationXSliderRef = useRef(null);
    const cameraRotationYSliderRef = useRef(null);
    const cameraRotationZSliderRef = useRef(null);
    let planets = [
        new Planet(10, 0, [1, 1, 0], 0, 0, 0, 0, 10, 0, 0, 0), //sun
        new Planet(5, 149.6, [0, 1, 0], 23.5, 0, 0, 0, 36, 0, 0, 0),
        new Planet(5, 149.6, [0, 1, 1], 3.5, 0, 0, 0, 10, 0, 0, 0),
    ];
    let camera = new Camera(0, 0, 0, 0, 0, 0, Math.PI / 2, height / width);


    function init(canvas, gl) {
        var gui = new dat.GUI();
        gui.add(camera.position, 0, 0,1)
        gui.add(camera.position, 1, 0,1)
        gui.add(camera.position, 2, 0,1)
        // Set the canvas size
        canvas.width = width;
        canvas.height = height;

        // Set clear color to black
        gl.clearColor(0, 0, 0, 1);

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

    function draw(gl) {
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
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Draw circles
            currentTime = timestamp;
            deltaTime = (currentTime - previousTimestamp.current) / 1000; // Convert to seconds
            previousTimestamp.current = currentTime;

            update(deltaTime)
            draw(gl)

            // Request the next frame
            animationFrameId.current = requestAnimationFrame(updateCanvas);
        };

        // Start the update loop
        updateCanvas(0);

        // Cleanup function to cancel animation frame on component unmount
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [width, height]);


    return <>
        <canvas ref={canvasRef}/>
    </>;
};

export default WebGLCanvas;