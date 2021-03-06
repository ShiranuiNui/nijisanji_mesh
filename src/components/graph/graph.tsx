import React, { FC, useRef, useEffect, useMemo } from 'react';
import { NodeData, LinkData } from './types';
import getInitializedForce from './forceSimulation';
import { useWindowSize } from '@react-hook/window-size';
import styled from '@emotion/styled';
import Link from './Link';
import Node from './Node';
import * as d3 from 'd3';
import { mean, stdev } from 'stats-lite';
import { makeSigmoid } from 'awesome-sigmoid';
import mixColor from 'mix-color';
import theme from '../../style/theme';

export const Graph: FC<{ nodes: NodeData[]; links: LinkData[] }> = ({
  nodes,
  links,
}) => {
  const [width, height] = useWindowSize();
  const force = useMemo(
    () =>
      getInitializedForce(nodes, links, {
        classname: { node: 'node', link: 'link' },
        window_size: { width, height },
        link_distance: 100,
      }),
    [width, height, nodes, links]
  );
  const svg = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (svg.current === null) return;
    force.registerGraph(svg.current);
  });

  const link_nums = links.map((x) => x.num);
  const link_mean = mean(link_nums);
  const link_stdev = stdev(link_nums);
  const sigmoid = makeSigmoid({
    center: link_mean,
    deviation: link_stdev,
    deviation_output: 0.9,
  });

  //move and zoom handler
  const graph_position = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const root_group = useRef<SVGGElement | null>(null);
  useEffect(() => {
    if (svg.current === null) return;
    d3.select(svg.current as Element).call(
      d3
        .drag()
        .subject(() => {
          if (root_group.current === null) return;
          return { x: graph_position.current.x, y: graph_position.current.y };
        })
        .on('drag', (_: any) => {
          if (root_group.current === null) return;
          root_group.current.style.transform = `translate(${d3.event.x}px, ${d3.event.y}px)`;
          graph_position.current = { x: d3.event.x, y: d3.event.y };
        })
    );
  }, []);

  //components
  const link_components = links.map((x) => (
    <Link data={x} key={x.id} weight={sigmoid(x.num)} />
  ));
  const node_components = nodes.map((x) => (
    <Node data={x} force_simulation={force.force_simulation} key={x.id} />
  ));

  return (
    <GraphRoot ref={svg}>
      <g ref={root_group}>
        {link_components}
        {node_components}
      </g>
    </GraphRoot>
  );
};

const GraphRoot = styled.svg`
  display: block;
  width: 100%;
  height: 100vh;
  background: linear-gradient(
    0.1turn,
    ${mixColor('#fff', theme.colors.accent, 0.1)} 30%,
    ${mixColor('#fff', theme.colors.main, 0.1)}
  );
  cursor: move;

  * {
    transition: fill ease 0.5s, opacity ease 0.5s;
  }
`;

export default Graph;
