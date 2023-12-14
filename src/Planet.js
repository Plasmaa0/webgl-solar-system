import { getProjectionMatrix, getViewMatrix } from './Camera';
import icomesh from 'icomesh';
import { SunFragmentShaderSource, SunVertexShaderSource, fragmentShaderSource, vertexShaderSource } from './shaders';
import { get_camera_basis } from './Camera';
const { mat4 } = require('gl-matrix');


class Planet {
    constructor(size, radius, color, inclination, orbitPeriod, shininess = 100, satellites = [], isSun = false, centerX = 0, centerY = 0, centerZ = 0) {
        this.isSun = isSun
        this.size = size;
        this.radius = radius; // orbit radius
        this.color = color;
        this.inclination = inclination;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        this.orbitPeriod = orbitPeriod;
        this.centerX = centerX;
        this.centerY = centerY;
        this.centerZ = centerZ;
        this.currentAngle = 0;
        this.satellites = satellites;
        this.shininess = shininess;
    }

    update(deltaTime) {
        const angleIncrement = (Math.PI * 2) / this.orbitPeriod * deltaTime;
        this.currentAngle += angleIncrement;
        if (this.currentAngle >= Math.PI * 2) {
            this.currentAngle -= Math.PI * 2
        }

        this.x = this.centerX + Math.cos(this.currentAngle) * this.radius;
        this.y = this.centerY + Math.sin(this.currentAngle) * Math.sin(this.inclination) * this.radius;
        this.z = this.centerZ + Math.sin(this.currentAngle) * Math.cos(this.inclination) * this.radius;
        for (const satellite of this.satellites) {
            satellite.centerX = this.x
            satellite.centerY = this.y
            satellite.centerZ = this.z
            satellite.update(deltaTime)
        }
    }

    loadShader(gl, vertex, fragment) {
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertex);
        gl.compileShader(vertexShader);

        // Define the fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragment);
        gl.compileShader(fragmentShader);

        // Create a shader program and attach the shaders
        let shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        gl.useProgram(shaderProgram);
        return shaderProgram
    }

    draw(gl, shaderProgram, camera, params) {
        for (const satellite of this.satellites) {
            satellite.draw(gl, shaderProgram, camera, params)
        }
        if (this.isSun) {
            shaderProgram = this.loadShader(gl, SunVertexShaderSource, SunFragmentShaderSource)
        } else {
            shaderProgram = this.loadShader(gl, vertexShaderSource, fragmentShaderSource)
        }
        // generate an icosphere with 4 subdivisions
        const { vertices, triangles } = icomesh(params.planet_subdivisions);
        const normals = vertices;
        this.verticesBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(triangles),
            gl.STATIC_DRAW
        );

        // Create color buffer
        const colors = this.generateColors(vertices.length / 3);
        // const colors = this.generateHeightColors(vertices)
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
        mat4.scale(modelMatrix, modelMatrix, [this.size, this.size, this.size])
        const modelUniformLocation = gl.getUniformLocation(shaderProgram, "uModel");
        gl.uniformMatrix4fv(modelUniformLocation, false, modelMatrix);

        const aViewLocation = gl.getUniformLocation(shaderProgram, "uView");
        const aProjectionLocation = gl.getUniformLocation(shaderProgram, "uProjection");

        gl.uniformMatrix4fv(aViewLocation, false, getViewMatrix(camera));
        gl.uniformMatrix4fv(aProjectionLocation, false, getProjectionMatrix(gl, camera));

        if (!this.isSun) {
            this.normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
            let normalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
            gl.enableVertexAttribArray(normalLocation);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, 0, 0)

            ////
            let lightWorldPositionLocation = gl.getUniformLocation(shaderProgram, "u_lightWorldPosition");
            // gl.uniform3fv(lightWorldPositionLocation, [camera.position.x, camera.position.y, camera.position.z]);
            gl.uniform3fv(lightWorldPositionLocation, [0, 0, 0]);


            let lightDirectionLocation = gl.getUniformLocation(shaderProgram, "u_lightDirection");
            const [towards, right, up] = get_camera_basis(camera)
            gl.uniform3fv(lightDirectionLocation, [
                towards[0],
                towards[1],
                towards[2]
            ]);


            let cameraWorldPositionLocation = gl.getUniformLocation(shaderProgram, "u_viewWorldPosition");
            gl.uniform3fv(cameraWorldPositionLocation, [camera.position.x, camera.position.y, camera.position.z]);


            let shininessLocation = gl.getUniformLocation(shaderProgram, "u_shininess");
            gl.uniform1f(shininessLocation, this.shininess);

            let torch_fov_location = gl.getUniformLocation(shaderProgram, "u_torch_fov");
            // console.log(camera.torch_fov)
            gl.uniform1f(torch_fov_location, camera.torch_fov);

            let worldInverseMatrix = mat4.create()
            mat4.invert(worldInverseMatrix, modelMatrix);
            let worldInverseTransposeMatrix = mat4.create();
            mat4.transpose(worldInverseTransposeMatrix, worldInverseMatrix);
            // let worldViewProjectionLocation = gl.getUniformLocation(shaderProgram, "u_worldViewProjection");
            let worldInverseTransposeLocation = gl.getUniformLocation(shaderProgram, "u_worldInverseTranspose");
            // gl.uniformMatrix4fv(worldViewProjectionLocation, false, worldViewProjectionMatrix);
            gl.uniformMatrix4fv(worldInverseTransposeLocation, false, worldInverseTransposeMatrix);
        }
        // Draw planet
        if (params.planet_draw === 'dots') {
            gl.drawArrays(gl.POINTS, 0, vertices.length / 3);
        } else if (params.planet_draw === 'fill') {
            gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_SHORT, 0);
        } else if (params.planet_draw === 'lines') {
            gl.drawElements(gl.LINES, triangles.length, gl.UNSIGNED_SHORT, 0);
        }

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

    generateHeightColors(vertices) {
        const colors = [];
        for (let i = 0; i < vertices.length; i += 3) {
            colors.push(vertices[i + 0]);
            colors.push(vertices[i + 1]);
            colors.push(vertices[i + 2]);
        }
        return colors;
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

export default Planet;