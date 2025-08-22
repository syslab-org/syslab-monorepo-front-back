import axios from "axios";
import { useContext, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { LoadingFlowContext } from "../../../contexts/LoadingFlowContext";
import { buildRoutingPreview } from "../utils/buildRoutingPreview";
import { TYPE_VPC_NODE } from "../utils/constants";
import { groupInstancesBySubnet, groupSubnetsByVpc, validateTopology } from "../utils/topologyValidation";



const useDeployNetwork = ({ nodes, edges }) => {



  const { user } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transformedData, setTransformedData] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const { setLoadingFlow } = useContext(LoadingFlowContext);

  const processJsonToCloud = () => {

    // 1) Validación integral (bloquea deploy si hay errores)
    const { errors, warnings } = validateTopology(nodes, edges);
    if (errors.length > 0) {
      const message =
        "No se puede desplegar. Corrige estos errores:\n" +
        errors.map(e => `• ${e}`).join("\n");
      setErrorMessage(message);
      return;
    }
    if (warnings.length) {
      // opcional, no bloquea
      console.warn("Advertencias (no bloquean):\n" + warnings.join("\n"));
    }

    // 2) Preview de rutas (intra=local, inter=router)
    const preview = buildRoutingPreview(nodes, edges);


    // 3) VPCs del canvas
    const vpcNodes = nodes.filter(n => n.type === TYPE_VPC_NODE);
    if (vpcNodes.length === 0) {
      setErrorMessage("No hay VPC en el canvas.");
      return;
    }

    // 4) Payload final: una VPC por nodo VPC
    const vpcsPayload = vpcNodes.map(vpcNode => {
      const name = vpcNode.data?.vpcName || vpcNode.data?.title || vpcNode.id;
      const region = vpcNode.data?.region || "us-east-1";
      const cidr = vpcNode.data?.cidrBlock && vpcNode.data?.prefixLength
        ? `${vpcNode.data.cidrBlock}/${vpcNode.data.prefixLength}` : null;

      const pv = preview.vpcs.find(p => p.id === vpcNode.id);
      const mainRoutes = (pv?.main_route_table || []).map((r, i) => ({
        name: `rt-${i + 1}`,
        dest_cidr: r.dest_cidr,
        target: r.target,                 // "local" o "router-..."
        via_router_id: r.via_router_id || null
      }));

      const subnetsOfVpc = groupSubnetsByVpc(nodes, vpcNode.id).map(sn => {
        const instances = groupInstancesBySubnet(nodes, sn.id).map(inst => ({
          id: inst.id,
          ami: inst.data?.ami || "ami-default",
          instance_type: inst.data?.instanceType,
          ip_address: inst.data?.ipAddress,
          name: inst.data?.name,
          ssh_access: inst.data?.sshAccess
        }));

        return {
          name: sn.data?.subnetName || `subnet-${sn.id}`,
          cidr_block: sn.data?.cidrBlock,
          availability_zone: sn.data?.availabilityZone,
          public_ip: sn.data?.publicIp,
          subnet_type: sn.data?.subnetType,
          route_table: "main",
          instances
        };
      });

      return {
        id: vpcNode.id,
        name,
        region,
        cidr_block: cidr,
        internet_gateway: !!vpcNode.data?.internetGateway,
        nat_gateway: {
          enabled: !!vpcNode.data?.enableNatGateway,
          public_subnet: vpcNode.data?.natGatewayPublicSubnet || "",
          elastic_ip: vpcNode.data?.natGatewayElasticIp || ""
        },
        route_tables: [{ name: "main", routes: mainRoutes }],
        subnets: subnetsOfVpc
      };
    });

    // 5) Confirmación
    setTransformedData({ cloud: "aws", vpcs: vpcsPayload });
    setShowConfirmation(true);
  };

  const handleConfirmDeploy = async () => {
    setShowConfirmation(false);
    setLoadingFlow(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const url_api = user.settings.general.url_api_aws;
      await axios.post(url_api, transformedData);
      setLoadingFlow(false);
      setSuccessMessage("Deploy successful");
    } catch (error) {
      setLoadingFlow(false);
      setErrorMessage("Deploy failed. Please try again");
    }
  };

  const handleCancelDeploy = () => {
    setShowConfirmation(false);
    setTransformedData(null);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return {
    showConfirmation,
    transformedData,
    successMessage,
    errorMessage,
    processJsonToCloud,
    handleCancelDeploy,
    handleConfirmDeploy,
    handleCloseSnackbar
  };
};

export default useDeployNetwork;
