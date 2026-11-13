"""Acrescenta ao grafo local os serviços e as dependências do Compose de homologação."""

import json
from pathlib import Path

import yaml


def main():
    root = Path(__file__).resolve().parents[1]
    source = "compose.homolog.yml"
    graph_path = root / "graphify-out" / "graph.json"
    graph = json.loads(graph_path.read_text(encoding="utf-8"))
    with (root / source).open(encoding="utf-8") as compose:
        document = yaml.compose(compose, Loader=yaml.SafeLoader)
    services_key, services = next((key, value) for key, value in document.value if key.value == "services")
    service_ids = {key.value: f"compose_homolog_service_{key.value}" for key, _ in services.value}
    file_id = "compose_homolog_file"
    compose_ids = {
        node["id"] for node in graph["nodes"] if node.get("source_file") == source
    }
    graph["nodes"] = [node for node in graph["nodes"] if node["id"] not in compose_ids]
    graph["links"] = [
        link for link in graph["links"]
        if link["source"] not in compose_ids and link["target"] not in compose_ids
    ]
    graph["nodes"].append({
        "id": file_id, "label": source, "file_type": "document",
        "source_file": source, "source_location": f"L{services_key.start_mark.line + 1}",
    })

    for key, service in services.value:
        name = key.value
        node_id = service_ids[name]
        location = f"L{key.start_mark.line + 1}"
        graph["nodes"].append({
            "id": node_id, "label": f"Compose: {name}", "file_type": "document",
            "source_file": source, "source_location": location,
        })
        relationships = [(file_id, node_id, "contains", location)]
        for option, dependencies in service.value:
            if option.value == "depends_on":
                entries = (
                    (key for key, _ in dependencies.value)
                    if isinstance(dependencies, yaml.MappingNode) else dependencies.value
                )
                relationships.extend(
                    (node_id, service_ids[entry.value], "depends_on", f"L{entry.start_mark.line + 1}")
                    for entry in entries
                )
        for origin, target, relation, source_location in relationships:
            graph["links"].append({
                "source": origin, "target": target, "relation": relation,
                "source_file": source, "source_location": source_location,
                "confidence": "EXTRACTED", "confidence_score": 1.0, "weight": 1.0,
            })

    graph_path.write_text(json.dumps(graph, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Compose indexado: {len(service_ids)} serviços.")


if __name__ == "__main__":
    main()
