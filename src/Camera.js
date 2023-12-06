const { mat4, vec3 } = require('gl-matrix');

export const get_camera_basis = (camera) => {
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

export const getProjectionMatrix = (gl, camera) => {
    let projection = mat4.create()
    mat4.identity(projection);
    // console.log(gl.drawingBufferWidth, gl.drawingBufferHeight)
    mat4.perspective(projection, camera.perspective_fov, gl.drawingBufferWidth / gl.drawingBufferHeight, camera.near, camera.far)
    return projection
}

export const getViewMatrix = (camera) => {
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