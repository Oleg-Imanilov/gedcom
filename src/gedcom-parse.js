
const tag2prop = (node) => {
    delete node.parent
    delete node.level
    if (node.id === "") {
        delete node.id
    }
    if (node._ === "") {
        delete node._
    }
    if (node.children.length === 0) {
        delete node.children
    }
    const arr = node.children
    if (!arr) return
    delete node.children
    arr.forEach((n) => {
        tag2prop(n)
        const tag = n.tag
        delete n.tag
        const nKeys = Object.keys(n)
        if (nKeys.length === 1 && nKeys[0] === '_') {
            n = n._
        }
        if (node[tag]) {
            if (Array.isArray(node[tag])) {
                node[tag].push(n)
            } else {
                node[tag] = [node[tag], n]
            }
        } else {
            if(JSON.stringify(n)!=='{}') {
                node[tag] = n
            }
        }
    })
}

export function ged2json(gedTxt) {
    const lines = gedTxt.split('\n')
    let curr = { level: -1, children: [] }
    const root = curr
    lines.forEach((line) => {
        const parts = line.trim().split(' ')
        const level = parseInt(parts.shift())
        let tag = parts.shift()
        let id = ''
        if (tag && tag.startsWith('@')) {
            id = tag
            tag = parts.shift()
        }
        const _ = parts.join(' ')
        if(tag==='CONT') {
            curr._ += '\n' + _
        } else if (tag==='CONC') {
            curr._ += _
        } else {
            while (level <= curr.level) {
                curr = curr.parent
            }
            const newChild = { parent: curr, level, tag, id, _, children: [] }
            curr.children.push(newChild)
            curr = newChild
        }
    })
    tag2prop(root)
    return root
}
