import * as d3 from "d3";

window.d3 = d3


 

export default class GedTree {
    width = window.innerWidth;
    height = window.innerHeight;
    nodes = [];
    links = [];
    simulation = null;
    nodeRadius = 60
    svgId = null
   
    clickX = 300
    clickY = 300

    bgX0 = 0;
    bgy0 = 0;
    cX = 0
    cY = 0 // -window.innerHeight/2
    zoom = 1

    constructor(svgId, width, height, gedNav) {
        this.svgId = svgId
        this.width = width;
        this.height = height;
        this.gedNav = gedNav


        const nn = this.gedNav.getAllINDI()
            .map(d => ({ id:d.id, name: (d.NAME && d.NAME._ || d.NAME) + (d.SEX === 'F'?' ♀ ':d.SEX=== 'M'?' ♂ ':'') }))
            .filter(d => d.name)
        
        nn.sort()

         d3.select('#indi')
            .selectAll('option')
            .data(nn).join((enter) => {
                enter.append('option')
                .attr('value', d=>d.id)
                .text(d => d.name)
            })
        
        d3.select('#indi').on('change', (event) => {
            const id = event.target.value
            this.gedNav.select(id)
            const [links, nodes] = this.gedNav.getLinksNodes()
            console.log(nodes)
            this.setNodes(links, nodes, true);
            this.recenter()
        })

        this.initSvg()
        this.initSimulation()
    }

 
    initSvg = () => {
        d3.select(`#${this.svgId}`)
            .attr('width',  this.width)
            .attr('height', this.height)
            .attr("viewBox", `${this.cX} ${this.cY} ${this.width} ${this.height}`)
            .call(
                d3.drag()
                .on("start", this.dragBgStart)
                .on("drag", this.dragBg)
                .on("end", this.dragBgEnd));
        
        d3.select(`#${this.svgId}`)
            .on("wheel", this.zoomBg)
            
    }

    initSimulation() {
        const repelForce = d3.forceManyBody().strength(-100).distanceMax(400).distanceMin(90);
        this.simulation = d3
            .forceSimulation()
            .alphaDecay(0.1)
            .velocityDecay(0.3)
            .force("charge", d3.forceManyBody().strength(20))
            .force("repelForce", repelForce)
            .force("xAxis", d3.forceX(this.width / 2).strength(0.01))
            .force("yAxis", d3.forceY(this.height / 2).strength(0.01))
            .force("link", d3.forceLink().id(d => d.id).distance(this.dist).strength(this.strength))
            .force('collide', d3.forceCollide().radius((d) => {
                return d.type === 'FAM' ? this.nodeRadius * 2 : this.nodeRadius + 20
            }))
            .on("tick", this.ticked);

            this.recenter()
    }

    recenter() {
        this.simulation
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .alphaTarget(0.1)
            .restart();

        setTimeout(()=>{
            this.simulation.force("center", null)
        }, 3000)
    }

    zoomBg = (event, d) => {
        const z = event.wheelDelta > 0 ? 0.9 : 1.1;
        const ds = event.wheelDelta > 0 ? 0.05 : -0.05;

        this.zoom *= z 

        this.width *=  z
        this.height *= z
        this.cX += this.width * ds
        this.cY += this.height * ds

        d3.select("svg")
            .attr("viewBox", `${this.cX} ${this.cY} ${this.width} ${this.height}`)
    }

    dragBgStart = (event, d) => {
        this.bgX0 = event.x;
        this.bgy0 = event.y;
    }

    dragBg = (event, d) => {
        this.cX -= (event.x - this.bgX0) * this.zoom;
        this.cY -= (event.y - this.bgy0) * this.zoom;
        this.bgX0 = event.x;
        this.bgy0 = event.y;
        d3.select("svg")
            .attr("viewBox", `${this.cX} ${this.cY} ${this.width} ${this.height}`)
    }

    dragBgEnd = (d) => {

    }

    dist(d) {
        return 100
    }

    strength(d) {
        return 2
    }
    
    setNodes = (links, nodes) => {
        this.links = links
        // this.nodes = nodes;
        nodes.forEach((n) => {
            if(!this.nodes.find(d => d.id === n.id)) {
                this.nodes.push(n)
            }
        })
        this.simulation.nodes(this.nodes)
        this.simulation.force("link").links(this.links);
    }

    linkStroke(d) {
        if (d.type == 'married') {
            return "gold";
        } else if (d.type == 'divorced') {
            return "brown";
        } else {
            return "#ccc";
        }
    }

    linkStrokeDashed(d) {
        return d.type == 'divorced' ? "6,6":"0"
    }

    newLink = (enter) => {
        enter.append("line").lower()
        .attr("stroke-width", d => (d.type =='married' || d.type == 'divorced')?"8px":"6px" )
        .attr("stroke-dasharray", this.linkStrokeDashed)
        .attr("stroke", this.linkStroke)
    }

    updateLink(update) {
        update
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y)
    }

    exitAny(exit) {
        exit.remove()
    }

    dragstarted = (event, d) => {
        const {shiftKey} = event
        if (!event.active) this.simulation.alphaTarget(0.1).restart();
        d.fx = d.x;
        d.fy = d.y;

        const my_circle = d3.select(`#node_${d.id.replace(/\@/g,'')}`).select('circle');
        if (my_circle.attr("class") == "fixed" && shiftKey) {
            my_circle.attr("class", "not-fixed");
            d.fixed = false
        } else {
            my_circle.attr("class", "fixed");
            d.fixed = true
        }
    }

    dragged = (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended = (event, d) => {
        if (!event.active) this.simulation.alphaTarget(0);
        //stickiness - unfixes the node if not-fixed or a person
        const my_circle = d3.select(`#node_${d.id.replace(/\@/g,'')}`)
            .select('circle');

        if (my_circle.attr("class") == "not-fixed") {
            d.fx = null;
            d.fy = null;
        }
    }

    nodeBorderColor = (d) => {
        if(d.type === 'FAM') {
            return  d.fixed?"#9e7611":'GoldenRod'
        } else if (d.sex == "F") {
            return  d.fixed?"#cb6878": "pink";
        } else if (d.sex == "M") {
            return  d.fixed?"#229a9a":"cyan";
        } else {
            return "silver";
        }
    }

    fillCircle = (d) => {
        if (d.type == "FAM") {
            return d.fixed?"#bfa824":"gold";
        } else {
            if (d.image) {
                return `url(#image_${d.id.replace(/\@/g, '')})`;
            } else {
                if (d.sex == "F") {
                    return d.visited?"#f19393":"#f2b5b5"
                } else if (d.sex === "M") {
                    return d.visited?"#68c5f0":"#a9dbf2"
                } else {
                    return d.visited?"#bbb":"#eee"
                }
            }
        }
    }

    newNode = (enter) => {

        var defs = enter.append("defs");
        defs.append("pattern")
            .attr("id", d => `image_${d.id.replace(/\@/g, '')}`)
            .attr("width", 1)
            .attr("height", 1)
            .append("svg:image")
            .attr("xlink:href", d => d.image)
            .attr("height", this.nodeRadius*2+40)
            .attr("width", this.nodeRadius*2+40)
            .attr("x", -20)
            .attr("y", -20);

        const node = enter
            .append("g").raise()
            .attr('class', 'node')
            .attr('id', d => 'node_' + d.id.replace(/\@/g, ''))
            .call(d3.drag().on("start", this.dragstarted).on("drag", this.dragged).on("end", this.dragended))
        
        node.append("circle")
            .attr("r", d => d.type === 'FAM' ? 20 : this.nodeRadius)
            .attr("stroke-width", d => d.type === 'FAM'?"4px":"6px" )
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("fill", this.fillCircle)
            .attr("stroke", this.nodeBorderColor)    
            .on("click", (event, d) => {
                const {shiftKey} = event
                if (shiftKey) {
                    const my_circle = d3.select(`#node_${d.id.replace(/\@/g,'')}`).select('circle');
                    my_circle.attr("class", "not-fixed");
                    d.fixed = false
                    d.fx = null
                    d.fy = null
                } else {
                    this.gedNav.select(d.id)
                    d.visited = true
                    const [links, nodes] = this.gedNav.getLinksNodes(d.x, d.y)
                    this.setNodes(links, nodes, true);
                }
            });


        const txt = node.append("text")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .style("fill", "black")
            .attr("dx", 0)
            .attr("dy", 0)
            // .attr("dy", this.nodeRadius + 64)
            .attr("text-anchor", "middle")

        txt.append("tspan")
            .attr("x", 0)
            .attr("dy", this.nodeRadius + 16)
            .text(d => d.type === 'FAM' ? '':d.name)
        txt.append("tspan")
            .attr("x", 0)
            .attr("dy", d => d.type !== 'FAM' && d.title !== ''?16:0)
            .text(d => d.type === 'FAM' ? '':d.title)
        txt.append("tspan")
            .attr("x", 0)
            .attr("dy", 16)
            .text(d => d.type === 'FAM' ? '':(d.bd||d.dd?(d.bd + ' - ' + d.dd):''))

    }

    updateNode = (update) => {
        update.select('circle')
            .attr("cx", d => d.x)
            .attr("cy", d => d.y)
            .attr("fill", this.fillCircle)
            .attr("stroke", this.nodeBorderColor)

        update.select('text')
            .attr("transform", d => `translate(${d.x}, ${d.y})`);
    }

    ticked = () => {
        const svg =  d3.select(`#${this.svgId}`)
        
        svg.selectAll("line")
            .data(this.links, d => d.id )
            .join(this.newLink, this.updateLink, this.exitAny)

        svg.selectAll(".node")
            .data(this.nodes, d => d.id )
            .join(this.newNode, this.updateNode, this.exitAny);
    }
}
