export const vertexShaderSource = `
            attribute vec3 aPosition;
            attribute vec3 aColor;
            attribute vec3 aNormal;

            uniform mat4 uModel;
            uniform mat4 uView;
            uniform mat4 uProjection;
            uniform mat4 u_worldInverseTranspose;
            uniform vec3 u_lightWorldPosition;
            uniform vec3 u_viewWorldPosition;

            varying vec3 vColor;
            varying vec3 vNormal;
            varying vec3 v_surfaceToLight;
            varying vec3 v_surfaceToView;

            void main() {
                gl_Position = uProjection*uView*uModel*vec4(aPosition, 1.0);
                vColor = aColor;
                vNormal = mat3(u_worldInverseTranspose) * aNormal;
                
                vec3 surfaceWorldPosition = (uModel * vec4(aPosition, 1.0)).xyz;
                v_surfaceToLight = u_lightWorldPosition - surfaceWorldPosition;
                v_surfaceToView = u_viewWorldPosition - surfaceWorldPosition;
            }
        `;
export const fragmentShaderSource = `
            precision mediump float;

            uniform float u_shininess;

            varying vec3 vColor;
            varying vec3 vNormal;
            varying vec3 v_surfaceToLight;
            varying vec3 v_surfaceToView;

            void main() {
                // gl_FragColor = vec4(vColor, 1.0);

                vec3 normal = normalize(vNormal);
                vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
                vec3 surfaceToViewDirection = normalize(v_surfaceToView);
                vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

                float ambientStrength = 0.4;
                vec3 ambient = ambientStrength * vColor;

                float light = dot(normal, surfaceToLightDirection);
                
                float specular = 0.0;
                if (light > 0.0) {
                    specular = pow(dot(normal, halfVector), u_shininess);
                }

                gl_FragColor = vec4(vColor, 1.0);
                gl_FragColor.rgb *= (ambient+light);
                gl_FragColor.rgb += specular;
            }
        `;


export const SunVertexShaderSource = `
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
export const SunFragmentShaderSource = `
                precision mediump float;

                varying vec3 vColor;

                void main() {
                    gl_FragColor = vec4(vColor, 1.0);
                }
                `;
