import { useStoreApi } from '@xyflow/react'
import { useEffect } from 'react'
import { TYPE_SUBNETWORK_NODE, TYPE_VPC_NODE } from '../utils/constants'

export const useRestrictSubnetsInsideVPC = () => {

    const store = useStoreApi()

    useEffect(() => {
        const unsubscribe = store.subscribe(
            (state) => state.nodeInternals,
            (nodeInternals) => {
                const nodes = Array.from(nodeInternals.values())

                const vpcNode = nodes.find((n) => n.type === TYPE_VPC_NODE)
                if (!vpcNode || !vpcNode.width || !vpcNode.height) return

                const vpcBounds = {
                    x: vpcNode.positionAbsolute?.x || 0,
                    y: vpcNode.positionAbsolute?.y || 0,
                    width: vpcNode.width,
                    height: vpcNode.height,
                }

                for (const node of nodes) {
                    if (node.type !== TYPE_SUBNETWORK_NODE) continue

                    const { x, y } = node.positionAbsolute || { x: 0, y: 0 }
                    const width = node.width || 0
                    const height = node.height || 0

                    const insideX = x >= vpcBounds.x && x + width <= vpcBounds.x + vpcBounds.width
                    const insideY = y >= vpcBounds.y && y + height <= vpcBounds.y + vpcBounds.height

                    if (!insideX || !insideY) {
                         console.warn('La subred debe estar dentro de la VPC')
                    }
                }

            }, {
            equalityFn: (a, b) => a === b,
        }
        )
        return () => unsubscribe()
        
    }, [store])
}