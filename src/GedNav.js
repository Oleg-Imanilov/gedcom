import { ged2json } from "./gedcom-parse";
import { traverse, getByPath } from "./utils";

export class GedNav {
    gedJson = {};
    REFS = {};
    selected = {};

    constructor(getTxt) {
        this.gedJson = ged2json(getTxt);
        traverse(this.gedJson, (n, path) => {
            if (path.endsWith(".id")) {
                const p = path.split(".");
                this.REFS[n] = {
                    path: p.slice(0, p.length - 1).join("."),
                    type: p[0],
                    ...getByPath(this.gedJson, path, 1),
                };
            }
        });
    }

    
    select = (id, d = 1) => {
        this.selected[id] = true;
        if (d === 0) {
            return;
        }
        const node = this.REFS[id];
        if (!node)
            return;
        if (node.type === "FAM") {
            if (node.HUSB) {
                const hid = node.HUSB._ || node.HUSB;
                if (!this.selected[hid]) {
                    this.select(hid, d - 1);
                }
            }
            if (node.WIFE) {
                const wid = node.WIFE._ || node.WIFE;
                if (!this.selected[wid]) {
                    this.select(wid, d - 1);
                }
            }
            if (node.CHIL) {
                if (Array.isArray(node.CHIL)) {
                    node.CHIL.map(t => t._ || t).forEach((ch) => {
                        if (!this.selected[ch]) {
                            this.select(ch, d - 1);
                        }
                    });
                } else {
                    const chid = node.CHIL._ || node.CHIL;
                    if (!this.selected[chid]) {
                        this.select(chid, d - 1);
                    }
                }
            }
        } else if (node.type === "INDI") {
            const ff = Object.values(this.REFS).filter(n => n.type === 'FAM');
            const fams = ff.filter((n) => {
                return (
                    (n.HUSB && (n.HUSB._ === id || n.HUSB === id)) ||
                    (n.WIFE && (n.WIFE._ === id || n.WIFE === id)) ||
                    n.CHIL === id ||
                    (n.CHIL && n.CHIL._ === id) ||
                    (Array.isArray(n.CHIL) && n.CHIL.map(t => t._ || t).includes(id))
                );
            });
            fams.forEach((f) => {
                if (!this.selected[f.id]) {
                    this.select(f.id, d);
                }
            });
        }
    };

    getAllINDI = () => {
        return this.gedJson.INDI;
    };

    getLinksNodes1(x = 0, y = 0) {
        const nodes = [];
        const links = [];

        const fams = Object.values(this.REFS).filter(
            (n) => n.type == "FAM" && this.selected[n.id]
        );
        const indies = Object.values(this.REFS).filter(
            (n) => n.type == "INDI" && this.selected[n.id]
        );



        indies.forEach((n) => {
            let img = false; // (n.files && n.files[0] && n.files[0].source) || false;
            if (n.OBJE && n.OBJE.length > 0) {
                img = n.OBJE[0].FILE._;
            } else if (n.OBJE && n.OBJE.FILE) {
                img = n.OBJE.FILE._;
            }

            const indi = {
                type: "INDI",
                id: n.id,
                name: n.NAME._ || n.NAME || "?",
                title: n.TITL || '',
                sex: n.SEX || '',
                bd: n.BIRT && n.BIRT.DATE || '',
                dd: n.DEAT && n.DEAT.DATE || '',                
                image: img,
            }

            // if(n.BIRT && n.BIRT.DATE && typeof n.BIRT.DATE === 'string' )

            nodes.push(indi);
        });

        fams.forEach((n) => {
            nodes.push({
                type: "FAM",
                id: n.id,
                name: "",
                image: false,
            });
        });
        nodes.forEach((n) => {
            if (n.x === undefined || n.y === undefined) {
                n.x = x;
                n.y = y;
            }
        });


        fams.forEach((n, ix) => {
            if (n.WIFE) {
                const wid = n.WIFE._ || n.WIFE;
                links.push({
                    id: `${wid}-${n.id}`,
                    source: wid,
                    target: n.id,
                    type: n.DIV ? "divorced" : "married",
                });
            }
            if (n.HUSB) {
                const hid = n.HUSB._ || n.HUSB;
                links.push({
                    id: `${hid}-${n.id}`,
                    source: hid,
                    target: n.id,
                    type: n.DIV ? "divorced" : "married",
                });
            }
            if (n.HUSB && n.WIFE) {
                const wid = n.WIFE._ || n.WIFE;
                const hid = n.HUSB._ || n.HUSB;
                links.push({
                    id: `${hid}-${wid}`,
                    source: wid,
                    target: hid,
                    type: n.DIV ? "divorced" : "married",
                });
            }

            if (n.CHIL) {
                if (Array.isArray(n.CHIL)) {
                    n.CHIL.map(t => t._ || t).forEach((ch) => {
                        links.push({
                            id: `${ch}-${n.id}`,
                            source: ch,
                            target: n.id,
                            type: "child",
                        });
                    });
                } else {
                    const chid = n.CHIL._ || n.CHIL;
                    links.push({
                        id: `${chid}-${n.id}`,
                        source: chid,
                        target: n.id,
                        type: "child",
                    });
                }
            }
        });

        return [links, nodes];
    }


    getLinksNodes(x = 0, y = 0) {
        const nodes = {};
        const links = [];

        const fams = Object.values(this.REFS).filter(
            (n) => n.type == "FAM" && this.selected[n.id]
        );
        const indies = Object.values(this.REFS).filter(
            (n) => n.type == "INDI" && this.selected[n.id]
        );

        indies.forEach((n) => {
            let img = false; // (n.files && n.files[0] && n.files[0].source) || false;
            if (n.OBJE && n.OBJE.length > 0) {
                img = n.OBJE[0].FILE && n.OBJE[0].FILE._ || n.OBJE[0].FILE;
            } else if (n.OBJE && n.OBJE.FILE) {
                img = n.OBJE.FILE && n.OBJE.FILE._ || n.OBJE.FILE;
            }

            const indi = {
                type: "INDI",
                id: n.id,
                name: n.NAME._ || n.NAME || "?",
                title: n.TITL || '',
                sex: n.SEX || '',
                bd: n.BIRT && n.BIRT.DATE || '',
                dd: n.DEAT && n.DEAT.DATE || '',                
                image: img,
            }

            // if(n.BIRT && n.BIRT.DATE && typeof n.BIRT.DATE === 'string' )

            nodes[indi.id] = indi
        });

        fams.forEach((n) => {
            if(n.CHIL) {
                nodes[n.id] = {
                    type: "FAM",
                    id: n.id,
                    name: "",
                    image: false,
                };
            }
        });

        function addLink(id) {
            if(nodes[id]) {
                if(nodes[id].links)  {
                    nodes[id].links++
                } else {
                    nodes[id].links = 1
                }
            }
        }

        fams.forEach((n, ix) => {
            if (n.WIFE && n.CHIL) {
                const wid = n.WIFE._ || n.WIFE;
                links.push({
                    id: `${wid}-${n.id}`,
                    source: wid,
                    target: n.id,
                    type: n.DIV ? "divorced" : "married",
                });
                addLink(wid)
                addLink(n.id)
            }
            if (n.HUSB && n.CHIL) {
                const hid = n.HUSB._ || n.HUSB;
                links.push({
                    id: `${hid}-${n.id}`,
                    source: hid,
                    target: n.id,
                    type: n.DIV ? "divorced" : "married",
                });
                addLink(hid)
                addLink(n.id)
            }
            if (n.HUSB && n.WIFE) {
                const wid = n.WIFE._ || n.WIFE;
                const hid = n.HUSB._ || n.HUSB;
                links.push({
                    id: `${hid}-${wid}`,
                    source: wid,
                    target: hid,
                    type: n.DIV ? "divorced" : "married",
                });
                addLink(hid)
                addLink(wid)
            }

            if (n.CHIL) {
                if (Array.isArray(n.CHIL)) {
                    n.CHIL.map(t => t._ || t).forEach((ch) => {
                        links.push({
                            id: `${ch}-${n.id}`,
                            source: ch,
                            target: n.id,
                            type: "child",
                        });
                        addLink(ch)
                        addLink(n.id)
                    });
                } else {
                    const chid = n.CHIL._ || n.CHIL;
                    links.push({
                        id: `${chid}-${n.id}`,
                        source: chid,
                        target: n.id,
                        type: "child",
                    });
                    addLink(chid)
                    addLink(n.id)
                }
            }
        });

        const nArr = Object.values(nodes)

        nArr.forEach((n) => {
            if (n.x === undefined || n.y === undefined) {
                n.x = x;
                n.y = y;
            }
        });

        return [links, nArr];
    }
}
