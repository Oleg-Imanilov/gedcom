import GedTree from "./src/GedTree";
import { GedNav } from "./src/GedNav";

function previewImages() {
    const readAndPreview = (file) => {
        var reader = new FileReader();
        reader.addEventListener("load", function () {
            const gedNav = new GedNav(this.result);
            const chart = new GedTree(
                "mysvg",
                window.innerWidth,
                window.innerHeight,
                gedNav
            );
            window.genTree = chart;
            const i0 = gedNav.getAllINDI()[0];
            gedNav.select(i0.id, 1);

            const [links, nodes] = gedNav.getLinksNodes(500, 500);
            chart.setNodes(links, nodes);
        });
        reader.readAsText(file);
    };

    if (this.files) {
        [].forEach.call(this.files, readAndPreview);
    }
}

document.querySelector("#gedinput").addEventListener("change", previewImages);
