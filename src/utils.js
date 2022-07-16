export function traverse(obj, callback, path=false) {
    if(Array.isArray(obj)) {
        obj.forEach((n, ix) => { traverse(n, callback, `${path}.${ix}`) })
    } else if(typeof obj === 'object') {
        Object.keys(obj).forEach((key) => {
            traverse(obj[key], callback, path?`${path}.${key}`:key)
        })
    } else {
        callback(obj, path)
    }
}

export function getByPath(root, path, depth = 0) {
    const arr = path.replace(/^\./,'').split('.')
    let ret = root
    while(arr.length - depth>0) {
        const key = arr.shift()
        ret = ret[key]
    }
    return ret
}