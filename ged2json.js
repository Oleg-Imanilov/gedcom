function parse(gedTxt) {
    const lines = gedTxt.split('\n')
    let curr = { level: -1, children: [] }
    const root = curr
    lines.forEach((line) => {
        const parts = line.trim().split(' ')
        const level = parseInt(parts.shift())
        let tag = parts.shift()
        let ref = ''
        if (tag && tag.indexOf('@') === 0) {
            ref = tag
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
            const newChild = { parent: curr, level, tag, ref, _, children: [] }
            curr.children.push(newChild)
            curr = newChild
        }
    })
    tag2prop(root)
    return root
}

function tag2prop(node) {
    delete node.parent
    delete node.level
    if (node.ref === "") {
        delete node.ref
    }
    if (node._ === "") {
        delete node._
    }
    if (node.children.length === 0) {
        delete node.children
    }
    arr = node.children
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
            node[tag] = n
        }
    })
}


function getRefs(node, refs = {}) {
    if(node.ref) {
        refs[node.ref] = node
    }
    Object.values(node).forEach((n)=>{
        if(Array.isArray(n)) {
            n.forEach((nn)=>{
                if (typeof(nn)==='object') {
                    getRefs(nn, refs)
                }
            })
        } else if (typeof(n)==='object') {
            getRefs(n, refs)
        }
    })
    return refs
}

// module.exports = {
//     parse,
//     refs: getRefs
// }
